"""Train PPO on the actual SunP JavaScript simulator and export browser-readable weights."""
import argparse, json, subprocess, sys, time
from pathlib import Path
import numpy as np
import torch
from torch import nn
import gymnasium as gym
from gymnasium import spaces
from torchrl.data import ReplayBuffer, LazyTensorStorage
from tensordict import TensorDict

ROOT=Path(__file__).resolve().parents[1]
class SunPEnv(gym.Env):
    metadata={"render_modes":[]}
    def __init__(self,seed=123,max_steps=600):
        self.seed0=seed; self.max_steps=max_steps
        self.action_space=spaces.Discrete(4)
        self.observation_space=spaces.Box(low=-1.,high=1.,shape=(16,),dtype=np.float32)
        self.proc=subprocess.Popen(["node",str(ROOT/"training/sunp_bridge.js")],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,cwd=ROOT,bufsize=1)
    def _send(self,msg):
        self.proc.stdin.write(json.dumps(msg)+"\n");self.proc.stdin.flush()
        result=json.loads(self.proc.stdout.readline())
        if "error" in result: raise RuntimeError(result["error"])
        return result
    def reset(self,*,seed=None,options=None):
        super().reset(seed=seed)
        r=self._send({"type":"reset","seed":int(seed if seed is not None else self.seed0),"maxSteps":self.max_steps})
        return np.asarray(r["observation"],dtype=np.float32),{}
    def step(self,action):
        r=self._send({"type":"step","action":int(action)})
        return np.asarray(r["observation"],dtype=np.float32),float(r["reward"]),bool(r["terminated"]),bool(r["truncated"]),{"health":r["health"],"population":r["population"],"richness":r["richness"]}
    def close(self):
        if self.proc.poll() is None:self.proc.terminate();self.proc.wait(timeout=3)

class ActorCritic(nn.Module):
    def __init__(self):
        super().__init__()
        self.body=nn.Sequential(nn.Linear(16,128),nn.Tanh(),nn.Linear(128,96),nn.Tanh())
        self.actor=nn.Linear(96,4);self.critic=nn.Linear(96,1)
    def forward(self,x):
        h=self.body(x);return self.actor(h),self.critic(h).squeeze(-1)

def train(args):
    torch.manual_seed(args.seed);np.random.seed(args.seed)
    env=SunPEnv(args.seed,args.episode_steps);model=ActorCritic()
    optimizer=torch.optim.Adam(model.parameters(),lr=3e-4)
    # TorchRL trajectory storage is used for collected PPO rollout batches.
    replay=ReplayBuffer(storage=LazyTensorStorage(max_size=args.rollout))
    observations=[];actions=[];logps=[];rewards=[];dones=[];values=[]
    obs,_=env.reset(seed=args.seed);episodes=0;episode_reward=0.;history=[]
    for frame in range(args.frames):
        x=torch.tensor(obs,dtype=torch.float32)
        with torch.no_grad():
            logits,value=model(x);dist=torch.distributions.Categorical(logits=logits)
            action=dist.sample();logp=dist.log_prob(action)
        nxt,reward,terminated,truncated,info=env.step(action.item())
        observations.append(x);actions.append(action);logps.append(logp);rewards.append(torch.tensor(reward));dones.append(torch.tensor(float(terminated or truncated)));values.append(value)
        episode_reward+=reward;obs=nxt
        if terminated or truncated:
            episodes+=1;history.append({"episode":episodes,"reward":episode_reward,"health":info["health"],"population":info["population"],"richness":info["richness"]})
            episode_reward=0.;obs,_=env.reset(seed=args.seed+episodes)
        if len(observations)<args.rollout and frame+1<args.frames:continue
        with torch.no_grad():
            _,next_value=model(torch.tensor(obs,dtype=torch.float32))
        rew=torch.stack(rewards);done=torch.stack(dones);val=torch.stack(values)
        adv=torch.zeros_like(rew);gae=0.
        for t in reversed(range(len(rew))):
            nv=next_value if t==len(rew)-1 else val[t+1]
            nonterminal=1-done[t];delta=rew[t]+args.gamma*nv*nonterminal-val[t]
            gae=delta+args.gamma*args.gae_lambda*nonterminal*gae;adv[t]=gae
        returns=adv+val
        batch={"obs":torch.stack(observations),"action":torch.stack(actions),"old_logp":torch.stack(logps),"adv":adv,"returns":returns}
        rollout_td=TensorDict(batch,batch_size=[n])
        replay=ReplayBuffer(storage=LazyTensorStorage(max_size=args.rollout))
        replay.extend(rollout_td)
        adv=(adv-adv.mean())/(adv.std(unbiased=False)+1e-8)
        n=len(adv)
        for _ in range(args.epochs):
            idx=torch.randperm(n)
            for ids in idx.split(args.minibatch):
                logits,v=model(batch["obs"][ids]);dist=torch.distributions.Categorical(logits=logits)
                ratio=(dist.log_prob(batch["action"][ids])-batch["old_logp"][ids]).exp()
                unclipped=ratio*adv[ids];clipped=ratio.clamp(1-args.clip,1+args.clip)*adv[ids]
                policy_loss=-torch.minimum(unclipped,clipped).mean()
                value_loss=.5*(v-batch["returns"][ids]).pow(2).mean()
                entropy=dist.entropy().mean()
                loss=policy_loss+args.vf_coef*value_loss-args.ent_coef*entropy
                optimizer.zero_grad();loss.backward();nn.utils.clip_grad_norm_(model.parameters(),.5);optimizer.step()
        observations.clear();actions.clear();logps.clear();rewards.clear();dones.clear();values.clear()
    env.close()
    out=ROOT/"public"/"models";out.mkdir(parents=True,exist_ok=True)
    layers=[]
    linears=[m for m in model.body if isinstance(m,nn.Linear)]+[model.actor]
    for layer in linears:
        layers.append({"weights":layer.weight.detach().cpu().tolist(),"bias":layer.bias.detach().cpu().tolist()})
    payload={"version":1,"algorithm":"PPO","inputSize":16,"actions":4,"actionNames":["repair","conserve","balance","diversity"],"layers":layers,"frames":args.frames,"seed":args.seed,"episodes":episodes,"history":history[-100:]}
    (out/"sun-ppo.json").write_text(json.dumps(payload,separators=(",",":")),encoding="utf-8")
    (out/"sun-ppo-metrics.json").write_text(json.dumps({"algorithm":"PPO","frames":args.frames,"episodes":episodes,"recentEpisodes":history[-100:]},indent=2),encoding="utf-8")
    print(json.dumps({"model":str(out/"sun-ppo.json"),"episodes":episodes,"recent":history[-5:]}))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--frames",type=int,default=50000);p.add_argument("--rollout",type=int,default=1024);p.add_argument("--episode-steps",type=int,default=600);p.add_argument("--epochs",type=int,default=4);p.add_argument("--minibatch",type=int,default=128);p.add_argument("--gamma",type=float,default=.99);p.add_argument("--gae-lambda",type=float,default=.95);p.add_argument("--clip",type=float,default=.2);p.add_argument("--vf-coef",type=float,default=.5);p.add_argument("--ent-coef",type=float,default=.01);p.add_argument("--seed",type=int,default=123);train(p.parse_args())

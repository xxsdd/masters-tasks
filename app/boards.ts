import {initialState, type State} from './domain';

// Each board has a fixed publisher. Switching view never transfers task ownership.
export function boardFor(room:any, userId:string) {
  const role:'owner'|'partner'=room.mode || (room.owner===userId?'owner':'partner');
  const original=(room.owner===userId)===(role==='owner');
  const first:State=JSON.parse(room.state);
  const fallback=initialState(first.partnerName);
  fallback.partnerName=first.ownerName;
  return {role,column:original?'state':'reverse_state',state:original?first:room.reverse_state?JSON.parse(room.reverse_state) as State:fallback};
}

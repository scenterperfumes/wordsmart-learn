import { useEffect } from 'react';
import { jijiArt } from '@/lib/jiji-art';
export type JijiState='IDLE'|'HONESTY CHECK'|'STUDY MODE'|'CORRECT!'|'MISSED!';
const modes:Record<JijiState,keyof typeof jijiArt>={IDLE:'idle','HONESTY CHECK':'guard','STUDY MODE':'teacher','CORRECT!':'cheer','MISSED!':'angry'};
export function JijiBar({state,message}:{state:JijiState;message:string}){
 useEffect(()=>{window.dispatchEvent(new CustomEvent('jiji-status',{detail:{state,message}}));},[state,message]);
 return <JijiWidget state={state} message={message} docked/>;
}
export function JijiWidget({state,message,docked=false}:{state:JijiState;message:string;docked?:boolean}){const mode=modes[state];return <div className={`assistant-widget state-${mode} ${docked?'jiji-docked':''}`}><div className="jiji-stage" dangerouslySetInnerHTML={{__html:jijiArt[mode]}}/><div className="min-w-0"><div className="font-mono text-[10px] font-bold text-primary">JIJI · {state}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground" aria-live="polite">{message}</p></div></div>;}

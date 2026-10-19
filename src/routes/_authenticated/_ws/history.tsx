import { createFileRoute } from '@tanstack/react-router';
import { WordList } from '@/components/WordList';
import { pageMeta } from '@/lib/metadata';
export const Route=createFileRoute('/_authenticated/_ws/history')({head:()=>({meta:pageMeta('Learning History','Review timed-quiz mastery and your vocabulary practice pile.')}),component:()=> <WordList historyOnly/>});

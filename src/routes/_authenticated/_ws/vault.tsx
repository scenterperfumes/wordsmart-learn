import { createFileRoute } from '@tanstack/react-router';
import { WordList } from '@/components/WordList';
import { pageMeta } from '@/lib/metadata';
export const Route=createFileRoute('/_authenticated/_ws/vault')({head:()=>({meta:pageMeta('Word Database','Browse vocabulary with Bangla meanings, fifty words per page.')}),component:()=> <WordList/>});

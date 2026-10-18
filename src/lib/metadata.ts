export const pageMeta = (title: string, description: string) => [
  { title: `${title} · Learn Word Smart` }, { name: 'description', content: description },
  { property: 'og:title', content: `${title} · Learn Word Smart` }, { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
];
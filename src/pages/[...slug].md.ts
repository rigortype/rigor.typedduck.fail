import type { APIRoute, GetStaticPaths } from 'astro';
import { englishDocs, slugFor, pageBlock, type DocEntry } from '../lib/docs';

// One clean-markdown twin per English page: `/manual/01-installation.md`,
// `/handbook.md`, `/index.md`, … These are the link targets in `llms.txt` and
// the shared source material for `llms-full.txt`.
export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await englishDocs();
  return docs.map((entry) => ({
    params: { slug: slugFor(entry) },
    props: { entry },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: DocEntry };
  return new Response(`${pageBlock(entry)}\n`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

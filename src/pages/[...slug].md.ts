import type { APIRoute, GetStaticPaths } from 'astro';
import { allDocs, slugFor, pageBlock, type DocEntry } from '../lib/docs';

// One clean-markdown twin per page, English and Japanese:
// `/manual/01-installation.md`, `/ja/manual/01-installation.md`, `/handbook.md`,
// `/index.md`, `/ja/index.md`, … These are the link targets in `llms.txt` /
// `/ja/llms.txt` and the shared source material for `llms-full.txt`.
export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await allDocs();
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

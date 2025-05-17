// ============================================================
//  COPYRIGHT WARNING
//
//  This code is the intellectual property of Nadhif Radityo.
//  Unauthorized copying, distribution, modification, or use
//  of this code, in whole or in part, is strictly prohibited.
//
//  You MUST obtain explicit written permission from the author
//  before using this code in any form.
//
//  Contact: nadhifradityo(at)gmail(dot)com
//
//  © Nadhif Radityo. All rights reserved.
// ============================================================

import path from "path";
import url from "url";
import fs0 from "fs";
import fs from "fs/promises";
import { Readable, Writable } from "stream";
import { etag } from "hono/etag";
import { compress } from "hono/compress";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "@hono/node-server/serve-static";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempEsmPath = path.join(__dirname, "tempEsm");
if(!fs0.existsSync(tempEsmPath))
	await fs.mkdir(tempEsmPath);

class BailoutTransformStream extends TransformStream {
	static error = Symbol("BailoutError");
	constructor(limitBytes) {
		let totalBytes;
		super({
			start() {
				totalBytes = 0;
			},
			transform(chunk, controller) {
				totalBytes += chunk.length;
				if(totalBytes > limitBytes) {
					controller.error(BailoutTransformStream.error);
					return;
				}
				controller.enqueue(chunk);
			}
		});
	}
}
const streamToString = async readableStream => {
	const reader = readableStream.getReader();
	const decoder = new TextDecoder("utf-8");
	let result = "";
	while(true) {
		const { value, done } = await reader.read();
		if(value)
			result += decoder.decode(value, { stream: !done });
		if(done)
			break;
	}
	return result;
};
const cyrb53 = (str, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for(let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
const regexReplace = (regex, string, replacer) => {
	let lastIndex = 0;
	let result = "";
	let matcher;
	while((matcher = regex.exec(string)) != null) {
		const replace = replacer(matcher);
		result += string.slice(lastIndex, matcher.index);
		result += replace;
		lastIndex = matcher.index + matcher[0].length;
	}
	result += string.slice(lastIndex);
	return result;
};
const tryRelativeUrl = string => { try { const url = new URL(string, "http://n"); return `${url.pathname.slice(1)}${url.search}${url.hash}`; } catch(_) { return string; } };
const tryAbsoluteUrl = (string, base) => { try { return (new URL(string, base)).href; } catch(_) { return string; } };

const esmUpstream = "https://esm.sh/";
const esmBailoutSize = 1024 * 1024 * 1024;
const esmErrorCache = new Map();
setInterval(() => {
	const now = performance.now();
	for(const [k, v] of esmErrorCache.entries()) {
		if(now - v < 30 * 1000) continue;
		esmErrorCache.delete(k);
	}
}, 5000);

export default app => {
	app.get("/esm/*", async c => {
		const origin = (() => { try { return (new URL(c.req.url)).origin; } catch(_) { return null; } })() ?? c.header("Origin");
		const base = origin != null ? (new URL("/esm/", origin)).href : null;
		const targetPath = tryRelativeUrl(c.req.url).replace(/^\/?esm\/?/, "");
		if(targetPath == "" || /(?:^cdn-cgi\/|^gh\/|^(?:app\.css|main\.js|favicon\.(?:svg|ico))[^/]*?$)/.test(targetPath))
			return await c.notFound();
		if(esmErrorCache.has(targetPath) || esmErrorCache.size > 30) {
			c.header("X-Proxy-Error", encodeURIComponent(esmErrorCache.has(targetPath) ? "Upstream error" : "Too many errors"));
			return c.redirect(new URL(targetPath, esmUpstream), 302);
		}
		const pinned = /@[0-9A-Za-z.+-]+/.test(targetPath) && /^@?\d+(\.\d+)?(\.\d+)?(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/.test(targetPath.match(/@[0-9A-Za-z.+-]+/)[0]);
		const cacheHash = cyrb53(targetPath).toString(16);
		let cacheKey = targetPath.replace(/[/\\]+/g, "_").replace(/[:*?"<>|]/g, "_");
		if(cacheKey.length > 70) cacheKey = `${cacheKey.slice(0, 34)}...${cacheKey.slice(-33)}`;
		const metadataPath = path.join(tempEsmPath, `${cacheKey}-${cacheHash}.json`);
		const blobPath = path.join(tempEsmPath, `${cacheKey}-${cacheHash}.blob`);
		const trimHeaders = headers => Object.fromEntries([...headers.entries()].map(([_k, v]) => {
			const k = _k.toLowerCase();
			if(k == "content-type") return [_k, v];
			if(k == "cache-control") return [_k, v];
			if(k == "date") return [_k, v];
			if(k == "etag") return [_k, v];
			if(k == "location") return [_k, tryRelativeUrl(v)];
			if(k == "access-control-allow-origin") return [_k, v];
			if(k == "access-control-expose-headers") return [_k, v];
			if(k == "x-esm-path") return [_k, tryRelativeUrl(v)];
			if(k == "x-typescript-types") return [_k, tryRelativeUrl(v)];
			return null;
		}).filter(p => p != null));
		const fillHeaders = (headers, base) => Object.fromEntries(Object.entries(headers).map(([_k, v]) => {
			const k = _k.toLowerCase();
			if(k == "date") return null;
			if(k == "etag") return null;
			if(k == "location") return [_k, tryAbsoluteUrl(v, base)];
			if(k == "x-esm-path") return [_k, tryAbsoluteUrl(v, base)];
			if(k == "x-typescript-types") return [_k, tryAbsoluteUrl(v, base)];
			return [_k, v];
		}).filter(p => p != null));
		const fetchMetadata = async oldMetadata => {
			const oldMetadataHeaders = oldMetadata != null ? new Headers(oldMetadata.headers) : null;
			const response = await fetch(new URL(targetPath, esmUpstream), {
				redirect: "manual",
				headers: {
					...(oldMetadataHeaders?.get("Date") != null ? {
						"If-Modified-Since": oldMetadataHeaders.get("Date")
					} : {}),
					...(oldMetadataHeaders?.get("ETag") != null ? {
						"If-None-Match": oldMetadataHeaders.get("ETag")
					} : {})
				}
			});
			if(response.status == 304 && oldMetadata != null)
				return oldMetadata;
			if(!response.ok && ![301, 302, 303, 307, 308].includes(response.status))
				throw new HTTPException(response.status, { message: `Error while fetching from ${esmUpstream}\n${await response.text()}` });
			let bypass = (parseInt(response.headers.get("Content-Length")) || 0) > esmBailoutSize;
			if(response.body != null) {
				if(!bypass) {
					try {
						const contentType = response.headers.get("Content-Type") ?? "application/octet-stream";
						const replaceUrl = url => {
							if(url.startsWith("./")) return url;
							if(url.startsWith("/")) return `/esm${url}`;
							try {
								if((new URL(url)).hostname == "esm.sh")
									return tryAbsoluteUrl(tryRelativeUrl(url), base);
							} catch(_) {}
							// external reference, keep it as-is.
							return url;
						};
						if(contentType.startsWith("application/javascript") || contentType.startsWith("application/typescript")) {
							let content = await streamToString(response.body.pipeThrough(new BailoutTransformStream(esmBailoutSize)));
							content = regexReplace(/(\/\*\s*)(esm\.sh(?:\s+via\s+.+)*)(\s+-\s+.+\*\/)/gm, content, m => `${m[1]}${m[2]} via ${base}${m[3]}`);
							content = regexReplace(/((?:export|import)(?:\s*\*(?:\s*as\s+[a-zA-Z0-9_$]+\s+)?\s*|\s*{.*?}\s*|\s+[a-zA-Z0-9_$]+\s+)from\s*("|'))(.*?)(\2(?:\s*;|\s*$))/gm, content, m => `${m[1]}${replaceUrl(m[3])}${m[4]}`);
							content = regexReplace(/(import\s*("|'))(.*?)(\2(?:\s*;|\s*$))/gm, content, m => `${m[1]}${replaceUrl(m[3])}${m[4]}`);
							await fs.writeFile(blobPath, content, "utf-8");
						} else {
							const writable = Writable.toWeb(fs0.createWriteStream(blobPath));
							await response.body.pipeThrough(new BailoutTransformStream(esmBailoutSize)).pipeTo(writable);
						}
					} catch(e) {
						if(e != BailoutTransformStream.error)
							throw e;
						await fs.rm(blobPath, { force: true });
						bypass = true;
					}
				} else
					await response.body.cancel();
			}
			const metadata = {
				status: response.status,
				statusText: response.statusText,
				headers: trimHeaders(response.headers),
				timestamp: Date.now(),
				bypass: bypass
			};
			await fs.writeFile(metadataPath, JSON.stringify(metadata), "utf-8");
			return metadata;
		};
		const serveMetadata = async metadata => {
			if(metadata.bypass) {
				c.header("X-Proxy-Bypass", "1");
				return c.redirect(new URL(targetPath, esmUpstream), 302);
			}
			if([301, 302, 303, 307, 308].includes(metadata.status)) {
				return new Response(
					fs0.existsSync(blobPath) ? Readable.toWeb(fs0.createReadStream(blobPath)) : null,
					{
						status: metadata.status,
						statusText: metadata.statusText,
						headers: new Headers(fillHeaders(metadata.headers, base))
					}
				);
			}
			return await compress()(c, async () => {
				return await etag()(c, async () => {
					const response = c.res = await serveStatic({
						path: path.relative(tempEsmPath, blobPath),
						root: path.relative(path.resolve("./"), tempEsmPath)
					})(c, async () => {
						return c.res = await c.notFound();
					});
					for(const [k, v] of Object.entries(fillHeaders(metadata.headers, base)))
						c.header(k, v);
					return response;
				});
			});
		};
		let metadata = null;
		if(fs0.existsSync(metadataPath))
			metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
		if(metadata != null && Date.now() - metadata.timestamp < (pinned ? 1000 * 60 * 60 * 2 : 1000 * 30))
			return serveMetadata(metadata);
		try {
			metadata = await fetchMetadata(metadata);
		} catch(e) {
			if(metadata == null) {
				esmErrorCache.set(targetPath, performance.now());
				c.header("X-Proxy-Error", encodeURIComponent(e.message ?? ""));
				return c.redirect(new URL(targetPath, esmUpstream), 302);
			}
		}
		return serveMetadata(metadata);
	});
};

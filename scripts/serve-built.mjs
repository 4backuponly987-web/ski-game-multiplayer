import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const args=process.argv.slice(2),portArg=args.indexOf('--port');
const port=portArg>=0?Number(args[portArg+1]):5208;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.map':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
try{await stat(resolve(root,'index.html'));}catch{console.error('No built game found. Run npm ci, then npm run build.');process.exit(1);}
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);const ext=extname(file);const cache=ext==='.html'?'no-store, no-cache, must-revalidate, max-age=0':'public, max-age=31536000, immutable';res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Content-Length':data.length,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${server.address().port}/`;
 console.log(`Alpine Freeride v0.18.0 MULTIPLAYER\nLocal: ${url}\nKeep this window open. Ctrl+C stops the server.`);
 if(!args.includes('--no-open')&&process.platform==='win32')spawn('cmd.exe',['/d','/c','start','',url],{stdio:'ignore'}).on('error',()=>{});
});
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());

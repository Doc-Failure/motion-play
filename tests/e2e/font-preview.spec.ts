import {expect,releaseDirectory,test} from './fixtures'
import {createServer,type Server} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
let server:Server,origin:string
test.beforeAll(async()=>{
 const files:Record<string,string>={'/font-preview.html':'text/html','/font-preview.css':'text/css','/fonts/MOTION-SCRIBBLE-LICENSE.txt':'text/plain'}
 for(const weight of ['Regular','Bold'])for(const extension of ['ttf','woff2'])files[`/fonts/MotionScribble-${weight}.${extension}`]=`font/${extension}`
 server=createServer((request,response)=>{const path=new URL(request.url!,'http://localhost').pathname;if(!files[path]){response.writeHead(404).end();return}void readFile(resolve(releaseDirectory,path.slice(1))).then(bytes=>response.writeHead(200,{'Content-Type':files[path]}).end(bytes)).catch(()=>response.writeHead(500).end())})
 await new Promise<void>((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done)})
 const address=server.address();if(!address||typeof address==='string')throw new Error('Preview server unavailable');origin=`http://127.0.0.1:${address.port}`
})
test.afterAll(async()=>{if(server?.listening)await new Promise<void>((done,fail)=>server.close(error=>error?fail(error):done()))})
test.use({acceptDownloads:true})

test('original font draft loads both weights, preserves editable text and serves local downloads',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(origin+'/font-preview.html')
 const loaded=await page.evaluate(async()=>{
  await Promise.all([document.fonts.load('400 24px Scribble'),document.fonts.load('700 24px Scribble')])
  return [...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status}))
 })
 expect(loaded).toEqual(expect.arrayContaining([{family:'Scribble',weight:'400',status:'loaded'},{family:'Scribble',weight:'700',status:'loaded'}]))
 const widths=await page.evaluate(()=>{
  const text=document.createElement('span');text.textContent='little letters look lovely';text.style.cssText="font:60px Scribble;display:inline-block;white-space:nowrap;position:absolute;left:-10000px"
  document.body.append(text);text.style.fontFeatureSettings='"calt" 0';const plain=text.getBoundingClientRect().width
  text.style.fontFeatureSettings='"calt" 1';const handwritten=text.getBoundingClientRect().width;text.remove();return {plain,handwritten}
 })
 expect(Math.abs(widths.plain-widths.handwritten)).toBeGreaterThan(.1)
 const sample=page.getByRole('textbox',{name:'Try the Motion Scribble font'})
 await sample.fill('Motion Play!\nÈ ora di giocare · 0123456789')
 await expect(sample).toContainText('È ora di giocare')
 for(const size of [{width:1280,height:900},{width:390,height:844}]){
  await page.setViewportSize(size)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:test.info().outputPath(`motion-scribble-${size.width}.png`),fullPage:true})
 }
 for(const weight of ['Regular','Bold']){
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:`Download ${weight} TTF`}).click()])
  expect(download.suggestedFilename()).toBe(`MotionScribble-${weight}.ttf`)
  expect(await download.failure()).toBeNull()
 }
 expect(errors).toEqual([])
})

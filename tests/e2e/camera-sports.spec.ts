import {test,expect,openApp,completeReadyGate,hideAndRestoreTab} from './fixtures'
for(const [slug,title,mode] of [['goalkeeper','Goalkeeper','keeper'],['net-rally','Net Rally','net']] as const)for(const players of [1,2,4] as const)test(`${title} ${players} players body input, recovery and replay`,async({page,installMockCamera})=>{
 test.setTimeout(45000);await installMockCamera({person:true})
 await openApp(page,`#/camera/${slug}`,async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{
 const el=parent.document.querySelector('.sport-game canvas');if(!el)return [];const s=JSON.parse(el.dataset.state);
 let targets=s.mode==='keeper'?s.shots.map((b,i)=>({x:(i+b.x)/${players},y:b.y})):s.ball.x<.48||${players}>1?[{x:s.ball.x,y:s.ball.y+.025}]:[];
 return targets.filter(t=>t.y<.85).map(t=>{const x=1-t.x,y=t.y,p=Array.from({length:33},()=>({x,y,visibility:0,presence:1}));for(const [id,dx,dy]of [[0,0,0],[7,-.01,0],[8,.01,0],[11,-.02,.1],[12,.02,.1]])p[id]={x:x+dx,y:y+dy,visibility:1,presence:1};return p;});},close:()=>{}})`}))})
 await page.getByRole('button',{name:players===1?'1 player':`${players} players`,exact:true}).click();await expect(page.getByLabel(`${title} movement demonstration`)).toBeVisible();if(mode==='net'&&players===2)await expect(page.getByText('1 vs 1: P1 stands LEFT, P2 stands RIGHT. Hit up and across the net. First to five!',{exact:true})).toBeVisible();await completeReadyGate(page)
 const canvas=page.locator('.sport-game canvas');await expect(page.locator('.sport-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect.poll(async()=>{const s=JSON.parse((await canvas.getAttribute('data-state'))!);return mode==='keeper'?s.shots[0].saves:s.ball.touches},{timeout:9000}).toBeGreaterThan(0)
 if(mode==='net'&&players===2){await expect(page.getByLabel('Match score')).toContainText('P1');await expect(page.getByLabel('Match score')).toContainText('P2');expect(JSON.parse((await canvas.getAttribute('data-state'))!).aiX).toBe(.75)}
 await page.screenshot({path:test.info().outputPath(`${slug}-${players}.png`)})
 await hideAndRestoreTab(page);const frozen=await canvas.getAttribute('data-state');await page.waitForTimeout(150);expect(await canvas.getAttribute('data-state')).toBe(frozen);await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+65000)
 await expect(page.getByRole('dialog',{name:`${title} results`})).toBeVisible();await expect(page.locator('.result-actions button')).toHaveCount(2)
 await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})

import {test,expect,openApp,completeReadyGate} from './fixtures'
for(const route of ['camera','games'])test(`Legacy ${route}/jump-rush opens the merged Kangaroo Race`,async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,`#/${route}/jump-rush`)
 await page.getByRole('button',{name:'1 player',exact:true}).click()
 await expect(page.getByLabel('Kangaroo Race movement demonstration')).toBeVisible()
 await expect(page.getByLabel('Jump Rush movement demonstration')).toHaveCount(0)
 await completeReadyGate(page)
 await expect(page.locator('.race-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await page.getByRole('button',{name:'Exit game',exact:true}).click()
 await expect(page.getByRole('link',{name:'Play Kangaroo Race',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Play Jump Rush',exact:true})).toHaveCount(0)
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})

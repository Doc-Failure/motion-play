import {expect,openApp,test} from './fixtures'

test('Google Analytics receives one page view per game route',async({page,installMockCamera})=>{
  await installMockCamera({denied:true})
  const requests:string[]=[]
  await page.route('https://www.googletagmanager.com/gtag/js**',route=>{
    requests.push(route.request().url())
    return route.fulfill({contentType:'application/javascript',body:''})
  })
  await openApp(page,'#/')
  await expect.poll(()=>requests.length).toBe(1)
  expect(requests[0]).toContain('id=G-TX7QGC83GY')
  await page.evaluate(()=>{location.hash='#/catalog'})
  await expect.poll(()=>page.evaluate(()=>{
    const entries=(window as unknown as {dataLayer:IArguments[]}).dataLayer
    return entries.filter(entry=>entry[0]==='event'&&entry[1]==='page_view').map(entry=>entry[2].page_path)
  })).toEqual(['/#/','/#/catalog'])
})

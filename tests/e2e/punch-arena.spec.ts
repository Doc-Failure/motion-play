import {expect,openApp,test} from './fixtures'

for(const section of ['camera','games']){
  test(`the original ${section}/punch-arena link opens Cardboard Champ`,async({page,installMockCamera})=>{
    await installMockCamera({person:true})
    await openApp(page,`#/${section}/punch-arena`)
    await page.getByRole('button',{name:'1 player',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Cardboard Champ',exact:true})).toBeVisible()
    await expect(page.getByRole('heading',{name:'Punch Arena',exact:true})).toHaveCount(0)
  })
}

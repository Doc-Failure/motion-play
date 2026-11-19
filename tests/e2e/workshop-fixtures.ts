import {createServer} from 'vite'
import {test as base} from './fixtures'
export {expect,completeReadyGate} from './fixtures'

// Keep the Vite server alive across files and test groups assigned to this worker.
export const test=base.extend<Record<never,never>,{workshopOrigin:string}>({
  // eslint-disable-next-line no-empty-pattern -- Playwright destructures the dependency list.
  workshopOrigin:[async ({},provide)=>{
    const external=process.env.MP_WORKSHOP_ORIGIN
    if(external){
      await provide(external)
      return
    }
    const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'})
    try {
      await server.listen()
      await provide(server.resolvedUrls!.local[0])
    } finally {
      await server.close()
    }
  },{scope:'worker'}]
})

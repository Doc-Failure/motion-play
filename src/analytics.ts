const measurementId = 'G-TX7QGC83GY'
const analyticsWindow = window as Window & {dataLayer?: IArguments[]}
analyticsWindow.dataLayer = analyticsWindow.dataLayer || []
// Google Tag's data layer expects the array-like arguments object.
// eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-rest-params
function gtag(..._args: unknown[]) { analyticsWindow.dataLayer!.push(arguments) }

gtag('js', new Date())
gtag('config', measurementId, {send_page_view: false, allow_google_signals: false})
function trackPage() {
  const path = location.pathname + location.hash.split('?')[0]
  gtag('event', 'page_view', {page_location: location.origin + path, page_path: path, page_title: document.title})
}
trackPage()
window.addEventListener('hashchange', trackPage)

const script = document.createElement('script')
script.async = true
script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
document.head.appendChild(script)

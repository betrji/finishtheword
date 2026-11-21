import './globals.css';
import './playful.css';
import './onboarding.css';
import './navigation.css';
import './board-theme.css';
import './definitions.css';
import './arena-welcome.css';
import './arena-experience.css';
import './room-directory.css';
import './daily-first.css';
import './uniform-theme.css';
import SiteBrand from './site-brand';
import TrafficTracker from './traffic-tracker';
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',themeColor:'#275d48'};
export const metadata={metadataBase:new URL('https://finishtheword.com'),title:'Finish the Word | Free Multiplayer Word Game',description:'Play a free word-chain game for 2–5 players. Beat the clock, outlast your rivals, and discover new words with definitions just a tap away.',alternates:{canonical:'/'},robots:{index:true,follow:true},openGraph:{images:[{url:'/social-preview.png',width:1200,height:630,alt:'Finish the Word: a free multiplayer word-chain game'}],type:'website',url:'https://finishtheword.com',siteName:'Finish the Word',title:'Finish the Word | Free Multiplayer Word Game',description:'Start with the last letter. Race the clock. Have the last word—and discover a few new ones along the way.'},twitter:{images:['/social-preview.png'],card:'summary_large_image',title:'Finish the Word | Free Multiplayer Word Game',description:'A free live word-chain game for 2–5 players. Outlast your rivals and explore the meaning of every word you play.'},icons:{icon:[{url:'/favicon.png',type:'image/png',sizes:'180x180'},{url:'/favicon.svg',type:'image/svg+xml',sizes:'any'},{url:'/favicon.ico',type:'image/x-icon',sizes:'16x16 32x32 48x48'}],shortcut:'/favicon.ico',apple:'/apple-touch-icon.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-theme="light" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('ftw-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}try{var motion=localStorage.getItem('arena-motion');document.documentElement.dataset.motion=motion==='full'||motion==='reduced'?motion:'system'}catch{document.documentElement.dataset.motion='system'}`}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'VideoGame','@id':'https://finishtheword.com/#game',sameAs:['https://x.com/finishtheword'],image:'https://finishtheword.com/social-preview.png',name:'Finish the Word',url:'https://finishtheword.com',description:'A free online multiplayer word-chain game for 2–5 players with ranked, casual, private-room and bot practice modes, plus a solo daily challenge and on-demand dictionary lookups to explore vocabulary.',genre:['Word game','Puzzle'],gamePlatform:'Web browser',applicationCategory:'Game',operatingSystem:'Any with a modern web browser',isAccessibleForFree:true,playMode:['MultiPlayer','SinglePlayer'],numberOfPlayers:{'@type':'QuantitativeValue',minValue:1,maxValue:5}})}}/><header className="standalone-site-header"><SiteBrand/></header>{children}<TrafficTracker/></body></html>}

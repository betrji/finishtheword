export function shouldShowWelcomeTutorial({ready,seen,hasHistory,active,queued,inRoom,deepLink,dialogOpen}:{ready:boolean,seen:boolean,hasHistory:boolean,active:boolean,queued:boolean,inRoom:boolean,deepLink:boolean,dialogOpen:boolean}){
 return ready&&!seen&&!hasHistory&&!active&&!queued&&!inRoom&&!deepLink&&!dialogOpen;
}
export function tutorialWasSeen(){try{return localStorage.getItem('ftw-tutorial-done')==='1'}catch{return false}}
export function rememberTutorial(){try{localStorage.setItem('ftw-tutorial-done','1')}catch{}}

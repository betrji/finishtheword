'use client';
import {useEffect,useState} from 'react';
import GameIcon from './game-icon';
export default function ThemeToggle(){const [dark,setDark]=useState(false);useEffect(()=>{setDark(document.documentElement.dataset.theme==='dark')},[]);return <button className="sound theme-toggle" aria-label={dark?'Use light theme':'Use dark theme'} title={dark?'Light theme':'Dark theme'} aria-pressed={dark} onClick={()=>{const next=!dark;setDark(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('ftw-theme',next?'dark':'light')}catch{}}}><GameIcon name={dark?'sun':'moon'}/></button>}

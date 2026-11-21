import type {MouseEventHandler} from 'react';
import Tile from './tile';

export default function SiteBrand({onClick}: {onClick?: MouseEventHandler<HTMLAnchorElement>}) {
  return <a className="brand" href="/" onClick={onClick} aria-label="Finish the Word home">
    <Tile letter="W" className="logo-tile"/>
    <span className="brand-wordmark">Finish<span>the Word</span></span>
  </a>;
}

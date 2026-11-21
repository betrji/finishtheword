export default function AdminBadge({admin}:{admin?:boolean}){
 return admin===true?<span className="sender-kind admin-badge" aria-label="Game administrator">ADMIN</span>:null;
}

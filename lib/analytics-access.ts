// Only platform-authenticated identity may authorize owner tools. Player names and cookies never do.
export function isAnalyticsOwner(user:{userId:string,email:string}|null,ownerEmail:unknown){
  return !!user?.userId&&typeof ownerEmail==='string'&&ownerEmail.trim().length>0&&user.email.toLowerCase()===ownerEmail.trim().toLowerCase();
}

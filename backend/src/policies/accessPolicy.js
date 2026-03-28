export function isAdmin(user) {
  return user?.roleCode === 'admin'
}

export function isOwner(user, ownerId) {
  return !!user && Number(user.sub) === Number(ownerId)
}

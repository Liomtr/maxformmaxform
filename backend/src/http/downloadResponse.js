export function sendDownloadBuffer(res, file) {
  res.setHeader('Content-Type', file.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
  res.send(file.buffer)
}

export async function streamDownloadArchive({ res, next, file }) {
  res.setHeader('Content-Type', file.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)

  file.archive.on('error', error => {
    if (!res.headersSent) {
      next(error)
      return
    }
    res.destroy(error)
  })

  file.archive.pipe(res)
  await file.archive.finalize()
}

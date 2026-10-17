function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function ascii(value: string) {
  return new TextEncoder().encode(value)
}

function u16(value: number) {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function u32(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

function crc32(data: Uint8Array) {
  let crc = ~0
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

export function dataUrlBytes(url: string) {
  const encoded = url.split(',')[1] || ''
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function safeName(title: string) {
  const cleaned = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || 'deck'
}

export function zipStore(files: { name: string; data: Uint8Array }[]) {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = ascii(file.name)
    const crc = crc32(file.data)
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), name, file.data,
    ])
    locals.push(local)
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]))
    offset += local.length
  }
  const central = concat(centrals)
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ])
  return concat([...locals, central, end])
}

export function pdfFromJpegs(pages: { jpeg: Uint8Array; width: number; height: number }[]) {
  const scale = 72 / 96
  const pageIds = pages.map((_, index) => ({
    image: 3 + index * 3,
    content: 4 + index * 3,
    page: 5 + index * 3,
  }))
  const total = 2 + pages.length * 3
  const bodies: Uint8Array[] = new Array(total + 1)
  bodies[1] = ascii('<< /Type /Catalog /Pages 2 0 R >>')
  bodies[2] = ascii(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id => `${id.page} 0 R`).join(' ')}] >>`)
  pages.forEach((page, index) => {
    const width = Math.max(1, Math.round(page.width * scale))
    const height = Math.max(1, Math.round(page.height * scale))
    const id = pageIds[index]
    const content = `q ${width} 0 0 ${height} 0 0 cm /Im${index} Do Q`
    bodies[id.image] = concat([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),
      page.jpeg,
      ascii('\nendstream'),
    ])
    bodies[id.content] = ascii(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    bodies[id.page] = ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${index} ${id.image} 0 R >> >> /Contents ${id.content} 0 R >>`)
  })

  const chunks: Uint8Array[] = [ascii('%PDF-1.4\n')]
  const offsets = [0]
  for (let id = 1; id <= total; id++) {
    offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    chunks.push(ascii(`${id} 0 obj\n`), bodies[id], ascii('\nendobj\n'))
  }
  const xrefAt = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= total; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  chunks.push(ascii(xref))
  return concat(chunks)
}

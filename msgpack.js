{// adapted from Yves Goergen's MIT github.com/ygoe/msgpack.js
  const pow32 = 0x100000000 // 2^32
  const encode = data => {
    let array = new Uint8Array(128)
    let length = 0
    append(data)

    function append(data) {
      data == null ? appendByte(0xc0) : (
        data.constructor === String ? appendString :
        data.constructor === Number ? appendNumber :
        data.constructor === Boolean ? appendBoolean :
        Array.isArray(data) ? appendArray :
        data instanceof Date ? appendDate :
        appendObject
      )(data)
    }

    function appendBoolean (data) {
      appendByte(data ? 0xc3 : 0xc2)
    }

    function appendNumber (data) {
      if (isFinite(data) && Math.floor(data) === data) {
        // Integer
        if (data >= 0 && data <= 0x7f) {
          appendByte(data)
        } else if (data < 0 && data >= -0x20) {
          appendByte(data)
        } else if (data > 0 && data <= 0xff) { // uint8
          appendBytes([0xcc, data])
        } else if (data >= -0x80 && data <= 0x7f) { // int8
          appendBytes([0xd0, data])
        } else if (data > 0 && data <= 0xffff) { // uint16
          appendBytes([0xcd, data >>> 8, data])
        } else if (data >= -0x8000 && data <= 0x7fff) { // int16
          appendBytes([0xd1, data >>> 8, data])
        } else if (data > 0 && data <= 0xffffffff) { // uint32
          appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data])
        } else if (data >= -0x80000000 && data <= 0x7fffffff) { // int32
          appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data])
        } else if (data > 0 && data <= 0xffffffffffffffff) { // uint64
          // Split 64 bit number into two 32 bit numbers because JavaScript only regards
          // 32 bits for bitwise operations.
          let hi = data / pow32
          let lo = data % pow32
          appendBytes([0xd3, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo])
        } else if (data >= -0x8000000000000000 && data <= 0x7fffffffffffffff) { // int64
          // Split 64 bit number into two 32 bit numbers because JavaScript only regards
          // 32 bits for bitwise operations.
          let hi, lo
          if (data >= 0) {
            // Same as uint64
            hi = data / pow32
            lo = data % pow32
          } else {
            // Split absolute value to high and low, then NOT and ADD(1) to restore negativity
            data++
            hi = Math.abs(data) / pow32
            lo = Math.abs(data) % pow32
            hi = ~hi
            lo = ~lo
          }
          appendBytes([0xd3, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo])
        } else if (data < 0) { // below int64
          appendBytes([0xd3, 0x80, 0, 0, 0, 0, 0, 0, 0])
        } else { // above uint64
          appendBytes([0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
        }
        return
      }
      // Float
      const buffer = new ArrayBuffer(8)
      new DataView(buffer).setFloat64(0, data)
      appendByte(0xcb)
      appendBytes(new Uint8Array(buffer))
    }

    function appendString (data) {
      const bytes = encodeUtf8(data)
      const len = bytes.length

      len <= 0x1f ? appendByte(0xa0 + len) :
      len <= 0xff ? appendBytes([0xd9, len]) :
      len <= 0xffff ? appendBytes([0xda, len >>> 8, len]) :
        appendBytes([0xdb, len >>> 24, len >>> 16, len >>> 8, len])

      appendBytes(bytes)
    }

    function appendArray (data) {
      const len = data.length

      len <= 0xf ? appendByte(0x90 + len) :
      len <= 0xffff ? appendBytes([0xdc, len >>> 8, len]) :
        appendBytes([0xdd, len >>> 24, len >>> 16, len >>> 8, len])

      for (const item of data) append(item)
    }

    function appendObject (data) {
      let len = 0
      for (const _ in data) len++

      len <= 0xf ? appendByte(0x80 + len) :
      len <= 0xffff ? appendBytes([0xde, len >>> 8, len]) :
        appendBytes([0xdf, len >>> 24, len >>> 16, len >>> 8, len])

      for (const key in data) {
        append(key)
        append(data[key])
      }
    }

    function appendDate (data) {
      let seconds = data.getTime() / 1000
      if (data.getMilliseconds() === 0 && seconds < 0x100000000) { // 32 bit seconds
        appendBytes([0xd6, 0xff, seconds >>> 24, seconds >>> 16, seconds >>> 8, seconds])
      } else {
        let nanoseconds = data.getMilliseconds() * 1000000
        if (seconds < 0x400000000) { // 30 bit nanoseconds, 34 bit seconds
          let seconds = data.getTime() / 1000
          appendBytes([0xd7, 0xff, nanoseconds >>> 22, nanoseconds >>> 14, nanoseconds >>> 6, ((nanoseconds << 2) >>> 0) | (seconds / pow32), seconds >>> 24, seconds >>> 16, seconds >>> 8, seconds])
        } else { // 32 bit nanoseconds, 64 bit seconds
          let seconds = data.getTime() / 1000
          hi = seconds / pow32
          lo = seconds % pow32
          appendBytes([0xc7, 12, 0xff, nanoseconds >>> 24, nanoseconds >>> 16, nanoseconds >>> 8, nanoseconds, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo])
        }
      }
    }

    function appendByte (byte) {
      if (array.length < length + 1) {
        let newLength = array.length * 2
        while (newLength < length + 1)
        newLength *= 2
        const newArray = new Uint8Array(newLength)
        newArray.set(array)
        array = newArray
      }
      array[length] = byte
      length++
    }

    function appendBytes (bytes) {
      if (array.length < length + bytes.length) {
        let newLength = array.length * 2
        while (newLength < length + bytes.length)
        newLength *= 2
        const newArray = new Uint8Array(newLength)
        newArray.set(array)
        array = newArray
      }
      array.set(bytes, length)
      length += bytes.length
    }

    function encodeUtf8 (str) {
      // Prevent excessive array allocation and slicing for all 7-bit characters
      let ascii = true
      for (let x = 0; x < str.length; x++) {
        if (str.charCodeAt(x) >= 128) {
          ascii = false
          break
        }
      }

      // Source: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
      let i = 0, bytes = new Uint8Array(str.length * (ascii ? 1 : 4))
      for (let ci = 0; ci != str.length; ci++) {
        let c = str.charCodeAt(ci)
        if (c < 128) {
          bytes[i++] = c
          continue
        }
        if (c < 2048) bytes[i++] = c >> 6 | 192
        else {
          if (c > 0xd7ff && c < 0xdc00) {
            if (++ci >= str.length) throw new Error('UTF8 encode: incomplete surrogate pair')
            const c2 = str.charCodeAt(ci)
            if (c2 < 0xdc00 || c2 > 0xdfff) throw new Error('UTF8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range')
            c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff)
            bytes[i++] = c >> 18 | 240
            bytes[i++] = c >> 12 & 63 | 128
          } else bytes[i++] = c >> 12 | 224
          bytes[i++] = c >> 6 & 63 | 128
        }
        bytes[i++] = c & 63 | 128
      }
      return ascii ? bytes : bytes.subarray(0, i)
    }

    return array.subarray(0, length)
  }

  const decode = array => {
    let pos = 0
    // if (pos < array.length) {} // Junk data at the end
    return read()

    function read () {
      const byte = array[pos++]
      if (byte >= 0x00 && byte <= 0x7f) return byte // positive fixint
      if (byte >= 0x80 && byte <= 0x8f) return readMap(byte - 0x80) // fixmap
      if (byte >= 0x90 && byte <= 0x9f) return readArray(byte - 0x90) // fixarray
      if (byte >= 0xa0 && byte <= 0xbf) return readStr(byte - 0xa0) // fixstr
      if (byte === 0xc0) return null // nil
      if (byte === 0xc1) throw new Error('Invalid byte code 0xc1 found.') // never used
      if (byte === 0xc2) return false // false
      if (byte === 0xc3) return true // true
      if (byte === 0xc4) return readBin(1) // bin 8
      if (byte === 0xc5) return readBin(2) // bin 16
      if (byte === 0xc6) return readBin(4) // bin 32
      if (byte === 0xc7) return readExt(-1, 1) // ext 8
      if (byte === 0xc8) return readExt(-1, 2) // ext 16
      if (byte === 0xc9) return readExt(-1, 4) // ext 32
      if (byte === 0xca) return readFloat(4) // float 32
      if (byte === 0xcb) return readFloat(8) // float 64
      if (byte === 0xcc) return readUInt(1) // uint 8
      if (byte === 0xcd) return readUInt(2) // uint 16
      if (byte === 0xce) return readUInt(4) // uint 32
      if (byte === 0xcf) return readUInt(8) // uint 64
      if (byte === 0xd0) return readInt(1) // int 8
      if (byte === 0xd1) return readInt(2) // int 16
      if (byte === 0xd2) return readInt(4) // int 32
      if (byte === 0xd3) return readInt(8) // int 64
      if (byte === 0xd4) return readExt(1) // fixext 1
      if (byte === 0xd5) return readExt(2) // fixext 2
      if (byte === 0xd6) return readExt(4) // fixext 4
      if (byte === 0xd7) return readExt(8) // fixext 8
      if (byte === 0xd8) return readExt(16) // fixext 16
      if (byte === 0xd9) return readStr(-1, 1) // str 8
      if (byte === 0xda) return readStr(-1, 2) // str 16
      if (byte === 0xdb) return readStr(-1, 4) // str 32
      if (byte === 0xdc) return readArray(-1, 2) // array 16
      if (byte === 0xdd) return readArray(-1, 4) // array 32
      if (byte === 0xde) return readMap(-1, 2) // map 16
      if (byte === 0xdf) return readMap(-1, 4) // map 32
      if (byte >= 0xe0 && byte <= 0xff) return byte - 256 // negative fixint
      throw new Error('Matched no byte code. Value is ' + byte + '. This should never happen.')
    }

    function readInt (size) {
      let value = 0
      let first = true
      while (size-- > 0) {
        if (first) {
          let byte = array[pos++]
          value += byte & 0x7f
          if (byte & 0x80) value -= 0x80 // Treat most-significant bit as -2^i instead of 2^i
          first = false
        }else {
          value *= 256
          value += array[pos++]
        }
      }
      return value
    }

    function readUInt (size) {
      let value = 0
      while (size-- > 0) {
        value *= 256
        value += array[pos++]
      }
      return value
    }

    function readFloat (size) {
      // Need to select the bytes here because readBin's subarray() is only a view
      const view = new DataView(array.buffer, pos, size)
      pos += size
      if (size === 4) return view.getFloat32(0, false)
      if (size === 8) return view.getFloat64(0, false)
    }

    function readBin (size) {
      const data = array.subarray(pos, pos + size)
      pos += size
      return data
    }

    function readMap (size, lengthSize) {
      if (size < 0) size = readUInt(lengthSize)
      const data = {}
      while (size-- > 0) {
        let key = read()
        data[key] = read()
      }
      return data
    }

    function readArray (size, lengthSize) {
      if (size < 0) size = readUInt(lengthSize)
      const data = []
      while (size-- > 0) data.push(read())
      return data
    }

    function readStr (size, lengthSize) {
      if (size < 0) size = readUInt(lengthSize)
      return decodeUTF8(readBin(size))
    }

    function readExt (size, lengthSize) {
      if (size < 0) size = readUInt(lengthSize)
      const type = readUInt(1)
      const data = readBin(size)
      return type === 255 ? readExtDate(data) : {type, data}
    }

    function readExtDate (data) {
      if (data.length === 4) return new Date((((data[0] << 24) >>> 0) + ((data[1] << 16) >>> 0) + ((data[2] << 8) >>> 0) + data[3]) * 1000)
      if (data.length === 8) {
        const ns = ((data[0] << 22) >>> 0) + ((data[1] << 14) >>> 0) + ((data[2] << 6) >>> 0) + (data[3] >>> 2)
        const sec = ((data[3] & 0x3) * pow32) + ((data[4] << 24) >>> 0) + ((data[5] << 16) >>> 0) + ((data[6] << 8) >>> 0) + data[7]
        return new Date(sec * 1000 + ns / 1000000)
      }
      if (data.length === 12) {
        const ns = ((data[0] << 24) >>> 0) + ((data[1] << 16) >>> 0) + ((data[2] << 8) >>> 0) + data[3]
        const hi = ((data[4] << 24) >>> 0) + ((data[5] << 16) >>> 0) + ((data[6] << 8) >>> 0) + data[7]
        const lo = ((data[8] << 24) >>> 0) + ((data[9] << 16) >>> 0) + ((data[10] << 8) >>> 0) + data[11]
        const sec = hi * pow32 + lo
        return new Date(sec * 1000 + ns / 1000000)
      }
      throw new Error('Invalid data length for a date value.')
    }

    function decodeUTF8 (bytes) {
      // Source: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
      let i = 0, str = ''
      while (i < bytes.length) {
        let c = bytes[i++]
        if (c > 127) {
          if (c > 191 && c < 224) {
            if (i >= bytes.length) throw new Error('UTF8 decode: incomplete 2-byte sequence')
            c = (c & 31) << 6 | bytes[i++] & 63
          } else if (c > 223 && c < 240) {
            if (i + 1 >= bytes.length) throw new Error('UTF8 decode: incomplete 3-byte sequence')
            c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63
          } else if (c > 239 && c < 248) {
            if (i + 2 >= bytes.length) throw new Error('UTF8 decode: incomplete 4-byte sequence')
            c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63
          } else throw new Error('UTF8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1))
        }
        if (c <= 0xffff) str += String.fromCharCode(c)
        else if (c <= 0x10ffff) {
          c -= 0x10000
          str += String.fromCharCode(c >> 10 | 0xd800)
          str += String.fromCharCode(c & 0x3FF | 0xdc00)
        } else throw new Error('UTF8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach')
      }
      return str
    }
  }

  typeof module != 'undefined'
    ? module.exports = {encode, decode}
    : this.msgpack = {encode, decode}
}

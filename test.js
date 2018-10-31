const ava = require('ava')
const {test} = ava
const msgpack = require('./msgpack.js')

const data = {
  number1: 1,
  number2: 20,
  number3: 200,
  number4: 200000,
  number5: 8000000000000,
  number6: -1,
  number7: -200,
  number8: -8000000000000,
  number9: 0.3,
  number10: 123.456,
  number11: -100.234,
  number12: -456789.345,
  number13: -0.127666,
  text1: 'Abc',
  text2: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vel odio vehicula, commodo turpis non, fringilla mi. Sed ornare urna ut accumsan cursus.',
  text3: 'In fermentum dui convallis, finibus velit ut, aliquam urna. Fusce vitae arcu dui. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Ut efficitur aliquet nulla, euismod sodales lorem blandit eu. Etiam rhoncus felis non nunc aliquam ullamcorper.',
  text4: ' Mauris vestibulum nibh nec gravida ullamcorper. Donec congue fermentum arcu, a interdum leo sollicitudin nec. Quisque pharetra nisl vitae lacinia iaculis. Donec egestas, dui eget faucibus tincidunt, dui eros sodales mauris, lobortis porta mauris odio eu dui. In vestibulum sodales felis, non faucibus eros volutpat vitae.',
  text5: 'この記事の内容の信頼性について検証が求められています。確認のための文献や情報源をご存じの方はご提示ください。出典を明記し、記事の信頼性を高めるためにご協力をお願いします。議論はノートを参照してください。（2008年11月）',
  text6: 'Some emoticons: 🐀򐀀 🐀򐰀 🐀򠠀 🐀򡀀',
  flag: true,
  list1: [1, 2, 'A', 'bc', false],
  list2: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  list3: [123, 4567, 89012, 345678, 9012345, 67890123, 456789012, 3456789012, 34567890123],
  list4: [0.123, 1.234, 2.3456, 3.45678, 4.5678901, 5.1234567, 6.123456],
  list5: ['A', 'Bb', 'C', 'Dd', 'E', 'Ff', 'G', 'Hh', 'I', 'Jj'],
  obj1: {
    a: 123,
    b: 456,
    c: 1.2,
    d: 'Text',
    obj: {
      x: 0,
      y: 4096,
      z: -3
    }
  }
}

const matchesData = (obj, base = data) => {
  if (obj.constructor === Object && base.constructor === Object) {
    for (const key in data) {
      if (!(key in obj)) return false
      const oval = obj[key]
      const bval = base[key]
      if (
        (oval == null && bval != null) ||
        (
          (typeof bval === 'string' || typeof oval === 'number') &&
          bval !== oval
        )
      ) {
        return false
      }
      const oc = oval.constructor
      const bc = bval.constructor
      if (
        oc !== bc ||
        (bc === Object && !matchesData(oval, bval)) ||
        (bc === Date && +oval !== +bval) ||
        (bc === Array && !compareArrays(oval, bval))
      ) return false

      return true
    }
  }

  const compareArrays = (arr, base) => {
    if (arr == null || arr.length !== base.length) return false
    for (const item of base) {
      if (!arr.includes(item)) return false
    }
    return true
  }
}

test('msgpack encodes/decodes correctly', d => {
  const raw = msgpack.encode(data)
  const out = msgpack.decode(raw)

  d.deepEqual(data, out)
})

test('msgpack encodes/decodes correctly again', d => {
  const raw = msgpack.encode(data)
  const out = msgpack.decode(raw)

  d.true(matchesData(out, data))
})
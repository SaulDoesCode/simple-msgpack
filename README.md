# msgpack.js

``simple-msgpack`` is an adaptation from [ygeo/msgpack.js](https://github.com/ygoe/msgpack.js)
this version is ES7+ and will not work in older browsers.

#### install the lastest
```html
<script src="https://unpkg.com/simple-msgpack">
```
or just download msgpack.min.js from the repo

### Weight Currently

raw: ``13.9kb``  
minified: ``5.76kb``  
minified + gzip: ~``2.2kb``  

## API

``.encode`` put in your objects, arrays, or what ever else JSON would have accepted

``.decode`` deserialize raw Uint8Arrays straight into what they were before they were encoded

```js
const person = {
  name: 'Bob Guy',
  languages: ['javascript', 'golang'],
  born: new Date(Date.parse('1 April 1997'))
}


const raw = msgpack.encode(person)

const decodedPerson = msgpack.decode(raw)

if (
  decodedPerson.name === person.name &&
  +decodedPerson.born === +person.born
) {
  console.log('all is well that decodes well!')
}
```

---

#### tip

if you need to decode a msgpack string, like, say from localStorage for example,
then do this:
```js
const data = localStorage
  .getItem('msgpack-stored-as-number-string')

const out = msgpack.decode(
  Uint8Array.from(
    data
      .split(',')
      .map(i => parseInt(i, 10))
  )
)

if (out.rightAsRain) {
  console.log('good!')
}
```

---

## LICENSE is MIT

Original creator is Yves github.com/ygoe.  
This is an adaptation/simplification of
his original project.   

This version, like his, is MIT so do what you will with it.
import CryptoJS from 'crypto-js'

const PreservedChecksumLength = 64

// eslint-disable-next-line no-undef
onmessage = function (e) {
  let count = 0
  const loadNext = index => {
    // eslint-disable-next-line no-undef
    const reader = new FileReader()
    reader.readAsArrayBuffer(e.data[index].file)

    reader.onload = (event) => {
      let arrayBuffer = event.target.result
      let wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
      let hash = CryptoJS.SHA512(wordArray).toString()
      hash = hash.substring(0, PreservedChecksumLength)
      count++

      if (count !== e.data.length) {
        // eslint-disable-next-line no-undef
        postMessage({ hash, index, count, done: false })
        loadNext(count)
      } else {
        // eslint-disable-next-line no-undef
        postMessage({ hash, index, count, done: true })
      }
    }
  }
  loadNext(0)
}

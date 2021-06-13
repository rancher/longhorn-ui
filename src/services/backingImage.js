import { request } from '../utils'

export async function query(params) {
  return request({
    url: '/v1/backingimages',
    method: 'get',
    data: params,
  })
}

export async function create(params) {
  return request({
    url: '/v1/backingimages',
    method: 'post',
    data: {
      ...params,
    },
  })
}

export async function deleteBackingImage(params) {
  if (params.actions && params.actions.backingImageCleanup) {
    return request({
      url: params.actions.backingImageCleanup,
      method: 'delete',
    })
  }
}

export async function deleteDisksOnBackingImage(params) {
  if (params.selected && params.selected.actions && params.selected.actions.backingImageCleanup) {
    return request({
      url: params.selected.actions.backingImageCleanup,
      method: 'post',
      data: {
        disks: params.rows.map(item => item.disk),
      },
    })
  }
}

export async function prepareChunk(url, params) {
  let urlParams = `&index=${params.index}&size=${params.size}&checksum=${params.checksum}`

  return request({
    url: `${url}${urlParams}`,
    method: 'post',
  })
}

export async function uploadChunk(url, params, headers, onProgress, i) {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-undef
    const xhr = new XMLHttpRequest()

    xhr.open('post', url)
    xhr.upload.onprogress = (e) => { onProgress(e, i + 1) }
    Object.keys(headers).forEach(key => xhr.setRequestHeader(key, headers[key]))
    xhr.send(params)
    xhr.onload = e => {
      resolve({
        data: e.target.response,
      })
    }
  })
}

export async function coalesceChunk(url, params) {
  let urlParams = `&count=${params.count}&size=${params.size}`

  return request({
    url: `${url}${urlParams}`,
    method: 'post',
  })
}

export async function closeUploadServer(url) {
  return request({
    url,
    method: 'post',
  })
}

export async function uploadServerStart(url, params) {
  let urlParams = `&size=${params.size}`

  return request({
    url: `${url}${urlParams}`,
    method: 'post',
    silence: true,
  })
}

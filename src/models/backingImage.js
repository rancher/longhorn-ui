import { create, deleteBackingImage, query, deleteDisksOnBackingImage, prepareChunk, uploadChunk, coalesceChunk, closeUploadServer, uploadServerStart } from '../services/backingImage'
import { parse } from 'qs'
import { wsChanges, updateState } from '../utils/websocket'
import queryString from 'query-string'
import { delay } from 'dva/saga'
import { message } from 'antd'
message.config({
  top: 60,
  duration: 5,
})

export default {
  ws: null,
  namespace: 'backingImage',
  state: {
    data: [],
    selected: {},
    createBackingImageModalVisible: false,
    createBackingImageModalKey: Math.random(),
    diskStateMapDetailModalVisible: false,
    diskStateMapDetailModalKey: Math.random(),
    diskStateMapDeleteDisabled: true,
    diskStateMapDeleteLoading: false,
    selectedDiskStateMapRows: [],
    selectedDiskStateMapRowKeys: [],
    socketStatus: 'closed',
  },
  subscriptions: {
    setup({ dispatch, history }) {
      history.listen(location => {
        dispatch({
          type: 'query',
          payload: location.pathname === '/backingImage' ? queryString.parse(location.search) : '',
        })
      })
    },
  },
  effects: {
    *query({
      payload,
    }, { call, put }) {
      const data = yield call(query, parse(payload))
      if (payload && payload.field && payload.keyword && data.data) {
        data.data = data.data.filter(item => item[payload.field] && item[payload.field].indexOf(payload.keyword.trim()) > -1)
      }
      if (data.data) {
        data.data.sort((a, b) => a.name.localeCompare(b.name))
      }
      yield put({ type: 'queryBackingImage', payload: { ...data } })
    },
    *create({
      payload,
      callback,
    }, { call, put }) {
      yield put({ type: 'hideCreateBackingImageModal' })
      let resp = yield call(create, payload)
      yield put({ type: 'query' })
      if (resp && resp.status === 200 && resp.message === 'OK') {
        if (callback) callback(resp)
      }
    },
    *delete({
      payload,
    }, { call, put }) {
      yield call(deleteBackingImage, payload)
      yield put({ type: 'query' })
    },
    *deleteDisksOnBackingImage({
      payload,
    }, { call, put }) {
      if (payload && payload.rows && payload.rows.length > 0) {
        yield put({ type: 'enableDiskStateMapDeleteLoading' })
        yield call(deleteDisksOnBackingImage, payload)
      }
      yield put({ type: 'disableDiskStateMapDeleteLoading' })
      yield put({ type: 'disableDiskStateMapDelete' })
      yield put({ type: 'hideDiskStateMapDetailModal' })
      yield put({
        type: 'changeDiskStateMapSelection',
        payload: {
          selectedDiskStateMapRowKeys: [],
          selectedDiskStateMapRows: [],
        },
      })
      yield put({ type: 'query' })
    },
    *startWS({
      payload,
    }, { select }) {
      let ws = yield select(state => state.backingImage.ws)
      if (ws) {
        ws.open()
      } else {
        wsChanges(payload.dispatch, payload.type, '1s', payload.ns)
      }
    },
    *stopWS({
      // eslint-disable-next-line no-unused-vars
      payload,
    }, { select }) {
      let ws = yield select(state => state.backingImage.ws)
      if (ws) {
        ws.close(1000)
      }
    },
    *upload({
      payload,
      callback,
    }, { call, put }) {
      let total = 0
      let chunkList = payload.prepareChunkList
      let actions = payload.backingImage && payload.backingImage.actions
      if (actions) {
        for (let i = 0; i < chunkList.length; i++) {
          let params = {
            size: chunkList[i].size,
            checksum: chunkList[i].checksum,
            index: chunkList[i].index,
          }
          let resp = yield call(prepareChunk, actions.chunkPrepare, params)
          total += params.size
          if (resp && !resp.exists) {
            // eslint-disable-next-line no-undef
            const formData = new FormData()

            formData.append('chunk', chunkList[i].data)
            formData.append('size', chunkList[i].size)
            formData.append('index', chunkList[i].index)
            formData.append('checksum', chunkList[i].checksum)

            yield call(uploadChunk, actions.chunkUpload, formData, {}, payload.onProgress, i)
          }
          yield put(
            { type: 'app/backingImageUploadProgress',
              payload: {
                backingImageUploadSize: total,
                backingImageuploadPercent: parseInt((total / payload.totalSize) * 100, 10),
              },
            }
          )
        }
        yield call(coalesceChunk, actions.chunkCoalesce, {
          size: total,
          count: chunkList.length,
        })
        yield call(closeUploadServer, actions.uploadServerClose)
        if (callback) callback()
      }
    },
    *uploadServerStart({
      payload,
      callback,
    }, { call }) {
      let resp = null
      for (let i = 0; i < 6; i++) {
        yield delay(3000)
        resp = yield call(uploadServerStart, payload.url, { size: payload.size })
        if (resp && resp.status === 200) break
        if (i === 5) {
          message.error('Please try to upload the file again')
        }
      }
      if (callback) callback(resp)
    },
  },
  reducers: {
    queryBackingImage(state, action) {
      return {
        ...state,
        ...action.payload,
      }
    },
    updateBackground(state, action) {
      return updateState(state, action)
    },
    showCreateBackingImageModal(state, action) {
      return { ...state, ...action.payload, createBackingImageModalVisible: true, createBackingImageModalKey: Math.random() }
    },
    hideCreateBackingImageModal(state) {
      return { ...state, createBackingImageModalVisible: false }
    },
    showDiskStateMapDetailModal(state, action) {
      return { ...state, selected: action.payload, diskStateMapDetailModalVisible: true, diskStateMapDetailModalKey: Math.random() }
    },
    hideDiskStateMapDetailModal(state) {
      return { ...state, diskStateMapDetailModalVisible: false, diskStateMapDetailModalKey: Math.random() }
    },
    disableDiskStateMapDelete(state) {
      return { ...state, diskStateMapDeleteDisabled: true }
    },
    enableDiskStateMapDelete(state) {
      return { ...state, diskStateMapDeleteDisabled: false }
    },
    disableDiskStateMapDeleteLoading(state) {
      return { ...state, diskStateMapDeleteLoading: false }
    },
    enableDiskStateMapDeleteLoading(state) {
      return { ...state, diskStateMapDeleteLoading: true }
    },
    changeDiskStateMapSelection(state, action) {
      return { ...state, ...action.payload }
    },
    updateSocketStatus(state, action) {
      return { ...state, socketStatus: action.payload }
    },
    updateWs(state, action) {
      return { ...state, ws: action.payload }
    },
  },
}

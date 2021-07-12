import { create, deleteBackingImage, query, deleteDisksOnBackingImage } from '../services/backingImage'
import { parse } from 'qs'
import { wsChanges, updateState } from '../utils/websocket'
import queryString from 'query-string'

export default {
  ws: null,
  namespace: 'backingImage',
  state: {
    data: [],
    selected: {},
    selectedRows: [],
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
      yield put({ type: 'clearSelection' })
    },
    *create({
      payload,
    }, { call, put }) {
      yield put({ type: 'hideCreateBackingImageModal' })
      yield call(create, payload)
      yield put({ type: 'query' })
    },
    *delete({
      payload,
    }, { call, put }) {
      yield call(deleteBackingImage, payload)
      yield put({ type: 'query' })
    },
    *bulkDelete({
      payload,
    }, { call, put }) {
      if (payload && payload.length > 0) {
        yield payload.map(item => call(deleteBackingImage, item))
      }
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
  },
  reducers: {
    queryBackingImage(state, action) {
      return {
        ...state,
        ...action.payload,
      }
    },
    changeSelection(state, action) {
      return { ...state, ...action.payload }
    },
    clearSelection(state) {
      return { ...state, selectedRows: [] }
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

import { query, execAction, restore, deleteBackup, createVolume, deleteAllBackups, getNodeTags, getDiskTags } from '../services/backup'
import { parse } from 'qs'
import queryString from 'query-string'
import { sortVolumeBackups, sortTable } from '../utils/sort'
import { getSorter, saveSorter } from '../utils/store'

export default {
  namespace: 'backup',
  state: {
    backupVolumes: [],
    selectedRows: [],
    backupVolumesForSelect: [],
    workloadDetailModalItem: {},
    filterText: 'all',
    backupStatus: {},
    currentItem: {},
    currentBackupVolume: {},
    lastBackupUrl: '',
    baseImage: '',
    volumeName: '',
    previousChecked: false,
    tagsLoading: true,
    size: '',
    backupLabel: {},
    nodeTags: [],
    diskTags: [],
    bulkRestoreData: [],
    backupVolumesForBulkCreate: [],
    search: {},
    isBulkRestore: false,
    restoreBackupModalVisible: false,
    workloadDetailModalVisible: false,
    createVolumeStandModalVisible: false,
    bulkCreateVolumeStandModalVisible: false,
    showBackuplabelsModalVisible: false,
    restoreBackupFilterKey: Math.random(),
    restoreBackupModalKey: Math.random(),
    createVolumeStandModalKey: Math.random(),
    bulkCreateVolumeStandModalKey: Math.random(),
    showBackupLabelsModalKey: Math.random(),
    workloadDetailModalKey: Math.random(),
    sorter: getSorter('backupList.sorter'),
  },
  subscriptions: {
    setup({ dispatch, history }) {
      history.listen(() => {
        let search = history.location && history.location.search ? queryString.parse(history.location.search) : {}
        // This code may cause confusion. React router does not pass parameters when right-clicking on Link,
        // resulting in no request for the page, so an Undefined judgment is added.

        let isbackupVolumePage = true
        let path = ['/node', '/dashboard', '/volume', '/engineimage', '/setting', '/backingImage']

        isbackupVolumePage = history.location && history.location.pathname && history.location.pathname !== '/' && path.every(ele => !history.location.pathname.startsWith(ele))

        if (history.location && (search.state || history.location.state || typeof (history.location.state) === 'undefined') && isbackupVolumePage) {
          dispatch({
            type: 'query',
            payload: search,
          })
          // Record search params for volume detail page
          dispatch({
            type: 'recordSearch',
            payload: { search },
          })
        }
      })
    },
  },
  effects: {
    *query({
      payload,
    }, { call, put }) {
      const data = yield call(query, parse(payload))
      const filter = payload && payload.field && payload.keyword
      if (data && data.status === 200) {
        data.data.sort((a, b) => sortTable(a, b, 'name'))
        yield put({ type: 'queryBackup', payload: { backupVolumes: data.data, backupVolumesForSelect: data.data } })
        if (filter) {
          const found = data.data.find(b => b.name === payload.keyword)
          if (found) {
            const list = yield call(execAction, found.actions.backupList)
            sortVolumeBackups(list.data)
            yield put({ type: 'queryBackup', payload: { data: list.data } })
          } else {
            yield put({ type: 'queryBackup', payload: { data: [] } })
          }
        } else {
          yield put({ type: 'queryBackup', payload: { data: null } })
        }
      }
      yield put({ type: 'clearSelection' })
    },
    *queryBackupStatus({
      payload,
    }, { call, put }) {
      const data = yield call(execAction, payload.url)
      yield put({ type: 'updateBackupStatus', payload: { backupStatus: { ...data } } })
    },
    *queryBackupDetailData({
      payload,
    }, { call, put }) {
      const data = yield call(execAction, payload.url)
      let lastBackup = null
      let params = {}

      if (data.data && data.data.length > 0) {
        data.data.forEach((item) => {
          if (item.name === payload.lastBackupName) {
            lastBackup = item
          }
        })
      }
      if (lastBackup) {
        params.fromBackup = lastBackup.url
        params.backupName = lastBackup.name
        params.numberOfReplicas = payload.numberOfReplicas
        params.volumeName = lastBackup.volumeName
        params.backingImage = payload.backingImage ? payload.backingImage : ''

        yield put({ type: 'showRestoreBackupModal', payload: { currentItem: params } })
        yield put({ type: 'queryDiskTagsAndgetNodeTags' })
      }
    },
    *beforeShowRestoreBackupModal({
      payload,
    }, { put }) {
      yield put({ type: 'showRestoreBackupModal', payload })
      yield put({ type: 'queryDiskTagsAndgetNodeTags' })
    },
    *queryBackupDetailBulkData({
      payload,
    }, { call, put }) {
      // const data = yield call(execAction, payload.url)
      if (payload && payload.selectedRows && payload.selectedRows.length > 0) {
        let data = []

        for (let i = 0; i < payload.selectedRows.length; i++) {
          if (payload.selectedRows[i].actions && payload.selectedRows[i].actions.backupList) {
            let res = yield call(execAction, payload.selectedRows[i].actions.backupList)
            if (res.data) {
              let lastBackup = null
              res.data.forEach((item) => {
                if (item.name === payload.selectedRows[i].lastBackupName) {
                  lastBackup = item
                }
              })
              data.push(lastBackup)
            }
          }
        }

        if (data && data.length > 0) {
          yield put({ type: 'showRestoreBulkBackupModal',
            payload: {
              currentItem: {
                name: '<Volume Name>',
                numberOfReplicas: payload.numberOfReplicas,
              },
              bulkRestoreData: data,
            },
          })

          yield put({ type: 'queryDiskTagsAndgetNodeTags' })
        }
      }
    },
    *restore({
      payload,
    }, { call, put, select }) {
      yield put({ type: 'hideRestoreBackupModal' })
      yield call(restore, payload)
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
    *queryDiskTagsAndgetNodeTags({
      payload,
    }, { call, put }) {
      const nodeTags = yield call(getNodeTags, payload)
      const diskTags = yield call(getDiskTags, payload)

      if (nodeTags.status === 200 && diskTags.status === 200) {
        yield put({ type: 'changeTagsLoading', payload: { nodeTags: nodeTags.data, diskTags: diskTags.data, tagsLoading: false } })
      } else {
        yield put({ type: 'changeTagsLoading', payload: { tagsLoading: false } })
      }
    },
    *restoreBulkBackup({
      payload,
    }, { call, put, select }) {
      let restoreBulkBackup = []
      yield put({ type: 'hideRestoreBackupModal' })
      if (payload.bulkRestoreData && payload.selectedBackup) {
        payload.bulkRestoreData.forEach((item) => {
          let params = {}
          params.numberOfReplicas = payload.selectedBackup.numberOfReplicas
          params.name = item.volumeName
          params.fromBackup = item.url
          params.nodeSelector = payload.selectedBackup.nodeSelector
          params.diskSelector = payload.selectedBackup.diskSelector
          restoreBulkBackup.push(params)
        })
      }
      if (restoreBulkBackup.length > 0) {
        for (let i = 0; i < restoreBulkBackup.length; i++) {
          yield call(restore, restoreBulkBackup[i])
        }
      }
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
    *delete({
      payload,
    }, { call, put, select }) {
      yield call(deleteBackup, payload)
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
    *createVolume({
      payload,
    }, { call, put, select }) {
      yield put({ type: 'hideCreateVolumeStandModalVisible' })
      yield call(createVolume, payload)
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
    *bulkCreateVolume({
      payload,
    }, { call, put, select }) {
      yield put({ type: 'hideBulkCreateVolumeStandModalVisible' })
      yield payload.map((item) => call(createVolume, item))
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
    *CreateStandVolume({
      payload,
    }, { call, put }) {
      const data = yield call(execAction, payload.actions.backupList)
      const found = data.data.find(b => b.name === payload.lastBackupName)
      yield put({ type: 'setCurrentBackupVolume', payload: { currentBackupVolume: payload } })
      yield put({ type: 'initModalUrl', found, payload })
      yield put({ type: 'showCreateVolumeStandModalVisible' })
      yield put({ type: 'queryDiskTagsAndgetNodeTags' })
    },
    *BulkCreateStandVolume({
      payload,
    }, { call, put }) {
      const data = yield payload.map((item) => call(execAction, item.actions.backupList))
      const volumes = data.map((item, index) => {
        const volume = payload[index]
        const found = item.data.find((b) => b.name === volume.lastBackupName)
        return {
          lastBackupUrl: found.url,
          volumeName: volume.name,
          baseImage: volume.baseImage,
          size: found.volumeSize,
        }
      })
      yield put({ type: 'initBulkCreateModalUrl', volumes })
      yield put({ type: 'showBulkCreateVolumeStandModalVisible' })
      yield put({ type: 'queryDiskTagsAndgetNodeTags' })
    },
    *deleteAllBackups({
      payload,
    }, { call, put, select }) {
      yield call(deleteAllBackups, payload)
      const search = yield select(store => { return store.backup.search })
      yield put({ type: 'query', payload: { ...search } })
    },
  },
  reducers: {
    queryBackup(state, action) {
      return {
        ...state,
        ...action.payload,
        restoreBackupFilterKey: Math.random(),
      }
    },
    clearSelection(state) {
      return {
        ...state,
        selectedRows: [],
      }
    },
    updateBackupStatus(state, action) {
      return {
        ...state,
        backupStatus: action.payload.backupStatus,
      }
    },
    /** createVolumeStandModalVisible */
    showCreateVolumeStandModalVisible(state) {
      return { ...state, createVolumeStandModalVisible: true, createVolumeStandModalKey: Math.random() }
    },
    hideCreateVolumeStandModalVisible(state) {
      return { ...state, createVolumeStandModalVisible: false, createVolumeStandModalKey: Math.random(), currentBackupVolume: {} }
    },
    showBulkCreateVolumeStandModalVisible(state) {
      return { ...state, bulkCreateVolumeStandModalVisible: true, bulkCreateVolumeStandModalKey: Math.random() }
    },
    hideBulkCreateVolumeStandModalVisible(state) {
      return { ...state, backupVolumesForBulkCreate: [], bulkCreateVolumeStandModalVisible: false, bulkCreateVolumeStandModalKey: Math.random() }
    },
    showBackuplabelsModalVisible(state, action) {
      return { ...state, showBackuplabelsModalVisible: true, backupLabel: action.payload, createVolumeStandModalKey: Math.random() }
    },
    hideBackuplabelsModalVisible(state) {
      return { ...state, showBackuplabelsModalVisible: false, createVolumeStandModalKey: Math.random() }
    },
    initModalUrl(state, action) {
      return { ...state, lastBackupUrl: action.found.url, volumeName: action.payload.name, baseImage: action.payload.baseImage, size: action.found.volumeSize }
    },
    initBulkCreateModalUrl(state, action) {
      return { ...state, backupVolumesForBulkCreate: action.volumes }
    },
    showRestoreBackupModal(state, action) {
      return { ...state, ...action.payload, restoreBackupModalVisible: true, restoreBackupModalKey: Math.random() }
    },
    showRestoreBulkBackupModal(state, action) {
      return { ...state, ...action.payload, isBulkRestore: true, restoreBackupModalVisible: true, restoreBackupModalKey: Math.random() }
    },
    hideRestoreBackupModal(state) {
      return { ...state, previousChecked: false, tagsLoading: true, restoreBackupModalVisible: false, isBulkRestore: false }
    },
    updateSorter(state, action) {
      saveSorter('backupList.sorter', action.payload)
      return { ...state, sorter: action.payload }
    },
    showWorkloadDetailModal(state, action) {
      return { ...state, workloadDetailModalVisible: true, workloadDetailModalItem: action.payload, workloadDetailModalKey: Math.random() }
    },
    hideWorkloadDetailModal(state) {
      return { ...state, workloadDetailModalVisible: false, workloadDetailModalKey: Math.random() }
    },
    changeSelection(state, action) {
      return { ...state, ...action.payload }
    },
    setPreviousChange(state, action) {
      return { ...state, previousChecked: action.payload }
    },
    changeTagsLoading(state, action) {
      return { ...state, ...action.payload }
    },
    recordSearch(state, action) {
      return { ...state, ...action.payload }
    },
    setCurrentBackupVolume(state, action) {
      return { ...state, ...action.payload }
    },
    filterBackupVolumes(state, action) {
      if (action.payload) {
        let key = action.payload.field
        let value = action.payload.value
        state.backupVolumes = []
        state.backupVolumesForSelect.find((item) => {
          if (item[key].indexOf(value) !== -1) {
            state.backupVolumes.push(item)
          }
          return null
        })
      }
      return { ...state, filterText: action.payload }
    },
  },
}

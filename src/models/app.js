/* eslint no-unused-vars: "off" */
import { getSupportbundles, getSupportbundlesStepTwo } from '../services/app'
import { getDataDependency } from '../utils/dataDependency'
import { message } from 'antd'

message.config({
  top: 60,
  duration: 5,
})

export default {
  namespace: 'app',
  state: {
    menuPopoverVisible: false,
    isNavbar: false,
    bundlesropsVisible: false,
    blur: false,
    progressPercentage: 0,
    bundlesropsKey: Math.random(),
    okText: 'OK',
    modalButtonDisabled: false,
    // backing image global uploading
    backingImageUploadSize: 0,
    backingImageuploadPercent: 0,
  },
  subscriptions: {
    setup({ dispatch, history }) {
      dispatch({ type: 'changeNavbar' })
      window.onresize = () => {
        dispatch({ type: 'changeNavbar' })
      }
      history.listen(location => {
        if (location.pathname) {
          let data = getDataDependency(location.pathname)
          if (data && data.runWs && data.stopWs) {
            data.runWs.forEach(item => {
              dispatch({ type: `${item.ns}/startWS`, payload: { type: item.key, ns: item.ns, dispatch } })
            })
            data.stopWs.forEach(item => {
              dispatch({ type: `${item.ns}/stopWS` })
            })
          }
        }
      })
    },
  },
  effects: {
    *changeNavbar({
      payload,
    }, { put, select }) {
      const isNavbar = yield select(store => { return store.app.isNavbar })

      if (document.body.clientWidth < 768 && !isNavbar) {
        yield put({ type: 'showNavbar' })
      } else if (document.body.clientWidth >= 768 && isNavbar) {
        yield put({ type: 'hideNavbar' })
      }
    },
    *supportbundles({
      payload,
    }, { call, put }) {
      const data = yield call(getSupportbundles, payload)

      if (data.status === 200) {
        let dataStepTwo = {}
        function timeout(ms) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve()
            }, ms, 'done')
          })
        }

        while (dataStepTwo.state !== 'ReadyForDownload') {
          yield call(timeout, 1000)
          dataStepTwo = yield call(getSupportbundlesStepTwo, data.nodeID, { name: data.name })
          yield put({ type: 'startProgressPercentage', payload: dataStepTwo.progressPercentage })
        }

        if (dataStepTwo.state === 'ReadyForDownload') {
          window.location.href = `${ window.__pathname_prefix__ }${ window.__pathname_prefix__.endsWith('/') ? '' : '/'}v1/supportbundles/${data.id}/${data.name}/download` // eslint-disable-line
        } else {
          message.error('Download failed support bundle creation is still in progress')
        }
        yield put({ type: 'hideBundlesModel' })
      }
    },
    *switchMenuPopver({
      payload,
    }, { put }) {
      yield put({
        type: 'handleSwitchMenuPopver',
      })
    },
  },
  reducers: {
    changeBlur(state, action) {
      return {
        ...state,
        blur: action.payload,
      }
    },
    showNavbar(state) {
      return {
        ...state,
        isNavbar: true,
        menuPopoverVisible: true,
      }
    },
    hideNavbar(state) {
      return {
        ...state,
        isNavbar: false,
        menuPopoverVisible: false,
      }
    },
    showBundlesModel(state) {
      return {
        ...state,
        bundlesropsVisible: true,
      }
    },
    hideBundlesModel(state) {
      return {
        ...state,
        bundlesropsVisible: false,
        bundlesropsKey: Math.random(),
        modalButtonDisabled: false,
        okText: 'OK',
        progressPercentage: 0,
      }
    },
    changeOkText(state) {
      return {
        ...state,
        okText: 'Generating...',
        modalButtonDisabled: true,
      }
    },
    handleSwitchMenuPopver(state) {
      return {
        ...state,
        menuPopoverVisible: !state.menuPopoverVisible,
      }
    },
    startProgressPercentage(state, action) {
      return {
        ...state,
        progressPercentage: action.payload,
      }
    },
    backingImageUploadProgress(state, action) {
      return {
        ...state,
        ...action.payload,
      }
    },
  },
}

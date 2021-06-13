import React from 'react'
import PropTypes from 'prop-types'
import { routerRedux } from 'dva/router'
import { connect } from 'dva'
import { Button, Progress, Row, Col, message } from 'antd'
import CreateBackingImage from './CreateBackingImage'
import BackingImageList from './BackingImageList'
import DiskStateMapDetail from './DiskStateMapDetail'
import { Filter } from '../../components/index'
import queryString from 'query-string'
// eslint-disable-next-line import/no-unresolved
import Worker from 'workers/hash.worker'

message.config({
  top: 60,
  duration: 5,
})

const SIZE = 10 * 1024 * 1024

class BackingImage extends React.Component {
  state = {
    generateChunkCount: 0,
    prepareChunkList: [],
    prepareChunkPercent: 0,
    generateChunkLoading: false,
    worker: null,
  };

  componentWillUnmount() {
    if (this.state.worker) {
      this.state.worker.terminate()
    }
  }

  createFileChunk = (file) => {
    this.setState({
      ...this.state,
      generateChunkLoading: true,
    })
    let fileChunkList = []
    let cur = 0
    while (cur < file.size) {
      fileChunkList.push({ file: file.slice(cur, cur + SIZE) })
      cur += SIZE
    }
    return fileChunkList
  }

  generateChunkHash = (data, worker, record, totalSize) => {
    this.props.dispatch({
      type: 'backingImage/uploadServerStart',
      payload: {
        url: record.actions.uploadServerStart,
        size: totalSize,
      },
      callback: (resp) => {
        // keep worker
        this.setState({
          ...this.state,
          worker,
        })
        // Make sure that the service has been started before generating slices
        if (resp && resp.status === 200) {
          worker.postMessage(data)
        } else {
          worker.terminate()
          this.setState({
            ...this.state,
            generateChunkLoading: false,
          })
        }
      },
    })
  }

  uploadChunk = (data, chunkfileList, record, totalSize) => {
    let total = chunkfileList.length
    let index = data.index
    let prepareChunk = {
      checksum: data.hash,
      size: chunkfileList[index].file.size,
      index,
      data: chunkfileList[index].file,
    }
    this.state.prepareChunkList.push(prepareChunk)
    this.setState({
      ...this.state,
      generateChunkCount: data.count,
      prepareChunkList: this.state.prepareChunkList,
      prepareChunkPercent: parseInt((data.count / total) * 100, 10),
    })

    if (total === data.count) {
      this.setState({
        ...this.state,
        generateChunkCount: 0,
        prepareChunkPercent: 100,
      })

      this.props.dispatch({
        type: 'backingImage/upload',
        payload: {
          prepareChunkList: this.state.prepareChunkList.sort((a, b) => {
            return a.index - b.index
          }),
          backingImage: record,
          totalSize,
          onProgress: (e) => {
            if (e.loaded) {
              if (e.loaded === e.total) {
                this.props.app.backingImageUploadSize += e.loaded
                this.props.dispatch({
                  type: 'app/backingImageUploadProgress',
                  payload: {
                    backingImageUploadSize: this.props.app.backingImageUploadSize,
                    backingImageuploadPercent: parseInt((this.props.app.backingImageUploadSize / totalSize) * 100, 10),
                  },
                })
              } else {
                this.props.dispatch({
                  type: 'app/backingImageUploadProgress',
                  payload: {
                    backingImageuploadPercent: parseInt(((this.props.app.backingImageUploadSize + e.loaded) / totalSize) * 100, 10),
                  },
                })
              }
            }
          },
        },
        callback: () => {
          this.setState({
            generateChunkCount: 0,
            prepareChunkList: [],
            prepareChunkPercent: 0,
            generateChunkLoading: false,
          })
          this.props.dispatch({
            type: 'app/backingImageUploadProgress',
            payload: {
              backingImageUploadSize: 0,
              backingImageuploadPercent: 0,
            },
          })
        },
      })
    }
  }

  workerError = () => {
    message.error('Generate Chunk error, Please try to upload the file again')
    this.setState({
      ...this.state,
      generateChunkLoading: false,
    })
  }

  render() {
    const { dispatch, loading, location } = this.props
    const { createFileChunk, generateChunkHash, uploadChunk, workerError } = this
    const { data, selected, createBackingImageModalVisible, createBackingImageModalKey, diskStateMapDetailModalVisible, diskStateMapDetailModalKey, diskStateMapDeleteDisabled, diskStateMapDeleteLoading, selectedDiskStateMapRows, selectedDiskStateMapRowKeys } = this.props.backingImage
    const { backingImageuploadPercent } = this.props.app
    const { field, value } = queryString.parse(this.props.location.search)
    let backingImages = data.filter((item) => {
      if (field && value) {
        return item[field] && item[field].indexOf(value.trim()) > -1
      }
      return true
    })
    if (backingImages && backingImages.length > 0) {
      backingImages.sort((a, b) => a.name.localeCompare(b.name))
    }
    const backingImageListProps = {
      dataSource: backingImages,
      loading: loading || this.state.generateChunkLoading,
      deleteBackingImage(record) {
        dispatch({
          type: 'backingImage/delete',
          payload: record,
        })
      },
      showDiskStateMapDetail(record) {
        dispatch({
          type: 'backingImage/showDiskStateMapDetailModal',
          payload: record,
        })
      },
      generateChunkHash,
      createFileChunk,
      uploadChunk,
    }

    const addBackingImage = () => {
      dispatch({
        type: 'backingImage/showCreateBackingImageModal',
      })
    }

    const createBackingImageModalProps = {
      item: {
        name: '',
        url: '',
      },
      visible: createBackingImageModalVisible,
      onOk(newBackingImage) {
        let params = {
          name: newBackingImage.name,
          imageURL: newBackingImage.imageURL,
          requireUpload: newBackingImage.requireUpload,
        }
        dispatch({
          type: 'backingImage/create',
          payload: params,
          callback: (record) => {
            if (newBackingImage.fileContainer && newBackingImage.fileContainer && newBackingImage.fileContainer.file && newBackingImage.requireUpload) {
              let chunkfileList = createFileChunk(newBackingImage.fileContainer.file.originFileObj)
              let totalSize = newBackingImage.fileContainer.file.originFileObj.size
              let worker = new Worker()
              generateChunkHash(chunkfileList, worker, record, totalSize)
              worker.onmessage = (e) => {
                uploadChunk(e.data, chunkfileList, record, totalSize)
                if (e.data.done) {
                  worker.terminate()
                }
              }
              worker.onerror = () => {
                workerError()
                worker.terminate()
              }
            }
          },
        })
      },
      onCancel() {
        dispatch({
          type: 'backingImage/hideCreateBackingImageModal',
        })
        dispatch({
          type: 'app/changeBlur',
          payload: false,
        })
      },
    }

    const diskStateMapDetailModalProps = {
      selected,
      backingImages,
      visible: diskStateMapDetailModalVisible,
      onCancel: () => {
        dispatch({ type: 'backingImage/hideDiskStateMapDetailModal' })
        dispatch({ type: 'backingImage/disableDiskStateMapDelete' })
        dispatch({
          type: 'backingImage/changeDiskStateMapSelection',
          payload: {
            selectedDiskStateMapRowKeys: [],
            selectedDiskStateMapRows: [],
          },
        })
      },
      deleteDisksOnBackingImage: (record) => {
        dispatch({
          type: 'backingImage/deleteDisksOnBackingImage',
          payload: {
            selected,
            rows: record,
          },
        })
      },
      selectedRows: selectedDiskStateMapRows,
      rowSelection: {
        selectedRowKeys: selectedDiskStateMapRowKeys,
        onChange: (selectedRowKeys, selectedRows) => {
          if (selectedRowKeys.length === 0) {
            dispatch({ type: 'backingImage/disableDiskStateMapDelete' })
          } else {
            dispatch({ type: 'backingImage/enableDiskStateMapDelete' })
          }
          dispatch({
            type: 'backingImage/changeDiskStateMapSelection',
            payload: {
              selectedDiskStateMapRowKeys: selectedRowKeys,
              selectedDiskStateMapRows: selectedRows,
            },
          })
        },
      },
      diskStateMapDeleteDisabled,
      diskStateMapDeleteLoading,
    }

    const backingImageFilterProps = {
      location,
      defaultField: 'name',
      fieldOption: [
        { value: 'name', name: 'Name' },
      ],
      onSearch(filter) {
        const { field: filterField, value: filterValue } = filter
        filterField && filterValue ? dispatch(routerRedux.push({
          pathname: '/backingImage',
          search: queryString.stringify({
            ...queryString.parse(location.search),
            field: filterField,
            value: filterValue,
          }),
        })) : dispatch(routerRedux.push({
          pathname: '/backingImage',
          search: queryString.stringify({}),
        }))
      },
    }
    let inPrepareChunkProgress = this.state.prepareChunkPercent > 0 && this.state.prepareChunkPercent < 100
    let inUploadProgress = backingImageuploadPercent > 0 && backingImageuploadPercent < 100
    let uploadDisabled = inPrepareChunkProgress || inUploadProgress

    return (
      <div className="content-inner">
        <Row gutter={24}>
          <Col lg={{ offset: 18, span: 6 }} md={{ offset: 16, span: 8 }} sm={24} xs={24} style={{ marginBottom: 16 }}>
            <Filter {...backingImageFilterProps} />
          </Col>
        </Row>
        { uploadDisabled ? <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', width: '25%', height: 50, zIndex: 9999 }}>
          { inPrepareChunkProgress ? <div>
            <Progress percent={this.state.prepareChunkPercent} />
            <span>Initializing</span>
          </div> : '' }
          { inUploadProgress ? <div>
            <Progress percent={backingImageuploadPercent} />
            <span>Uploading</span>
          </div> : ''}
        </div> : ''}
        <Button style={{ position: 'absolute', top: '-50px', right: '0px' }} size="large" type="primary" disabled={uploadDisabled || loading} onClick={addBackingImage}>Create Backing Image</Button>
        <BackingImageList {...backingImageListProps} uploadDisabled={uploadDisabled} />
        { createBackingImageModalVisible ? <CreateBackingImage key={createBackingImageModalKey} {...createBackingImageModalProps} /> : ''}
        { diskStateMapDetailModalVisible ? <DiskStateMapDetail key={diskStateMapDetailModalKey} {...diskStateMapDetailModalProps} /> : ''}
      </div>
    )
  }
}

BackingImage.propTypes = {
  app: PropTypes.object,
  backingImage: PropTypes.object,
  loading: PropTypes.bool,
  location: PropTypes.object,
  dispatch: PropTypes.func,
}

export default connect(({ app, backingImage, loading }) => ({ app, backingImage, loading: loading.models.backingImage }))(BackingImage)

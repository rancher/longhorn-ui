import React from 'react'
import PropTypes from 'prop-types'
import { Table, Button } from 'antd'
import BackingImageActions from './BackingImageActions'
import { formatMib } from '../../utils/formater'
// eslint-disable-next-line import/no-unresolved
import Worker from 'workers/hash.worker'

function list({ loading, uploadDisabled, dataSource, deleteBackingImage, showDiskStateMapDetail, generateChunkHash, createFileChunk, uploadChunk }) {
  const backingImageActionsProps = {
    deleteBackingImage,
  }

  const columns = [
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (text, record) => {
        if (record && record.deletionTimestamp) {
          return (<div className="degraded capitalize">deleting</div>)
        } else {
          return (<div className="healthy capitalize">Healthy</div>)
        }
      },
    }, {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text) => {
        return (
          <div>
            {text}
          </div>
        )
      },
    }, {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (text) => {
        return (
          <div>
            {formatMib(text)}
          </div>
        )
      },
    }, {
      title: 'Image URL',
      dataIndex: 'imageURL',
      key: 'imageURL',
      width: 400,
      render: (text) => {
        return (
          <div>
            {text}
          </div>
        )
      },
    }, {
      title: 'Backing Image state in disks',
      dataIndex: 'diskStateMap',
      key: 'diskStateMap',
      width: 300,
      render: (text, record) => {
        return (
          <div onClick={() => { showDiskStateMapDetail(record) }} style={{ width: '100%', cursor: 'pointer' }}>
            <Button type="link" block>Detail</Button>
          </div>
        )
      },
    }, {
      title: 'Operation',
      key: 'operation',
      width: 120,
      render: (text, record) => {
        let hideUpload = false
        if (record.diskStateMap) {
          hideUpload = Object.keys(record.diskStateMap).some((key) => {
            return record.diskStateMap[key] === 'ready'
          })
        }
        const uploadProps = {
          beforeUpload: (file) => {
            let chunkfileList = createFileChunk(file)
            let totalSize = file.size

            let worker = new Worker()
            generateChunkHash(chunkfileList, worker, record, totalSize)
            worker.onmessage = (e) => {
              uploadChunk(e.data, chunkfileList, record, totalSize)
              if (e.data.done) {
                worker.terminate()
              }
            }
            return false
          },
          showUploadList: false,
          uploadDisabled: !!record.imageURL || uploadDisabled || !record.actions.chunkUpload,
          hideUpload,
        }

        return (
          <BackingImageActions {...backingImageActionsProps} selected={record} uploadProps={uploadProps} />
        )
      },
    },
  ]

  const pagination = false

  return (
    <div>
      <Table
        bordered={false}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        simple
        pagination={pagination}
        rowKey={record => record.id}
      />
    </div>
  )
}

list.propTypes = {
  loading: PropTypes.bool,
  uploadDisabled: PropTypes.bool,
  dataSource: PropTypes.array,
  deleteBackingImage: PropTypes.func,
  showDiskStateMapDetail: PropTypes.func,
  generateChunkHash: PropTypes.func,
  createFileChunk: PropTypes.func,
  uploadChunk: PropTypes.func,
}

export default list

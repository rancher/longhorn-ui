import React from 'react'
import PropTypes from 'prop-types'
import { Table, Button, Icon, Tooltip } from 'antd'
import BackingImageActions from './BackingImageActions'
import { pagination } from '../../utils/page'
import { formatMib } from '../../utils/formater'

function list({ loading, dataSource, deleteBackingImage, showDiskStateMapDetail, rowSelection, height }) {
  const backingImageActionsProps = {
    deleteBackingImage,
  }
  const state = (record) => {
    if (record.deletionTimestamp) {
      // Dleteing
      return (<Tooltip title={'Deleteing'}><Icon type="sync" style={{ marginLeft: 10, color: '#f5222d' }} spin /></Tooltip>)
    }
    if (record.diskStateMap && Object.keys(record.diskStateMap).every((key) => record.diskStateMap[key] === 'failed')) {
      return (<Tooltip title={'The backingImage is unavailable'}><Icon type="warning" style={{ marginLeft: 10, color: '#f5222d' }} /></Tooltip>)
    }
    return ''
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => {
        return (
          <div>
            {text}
            {state(record)}
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
      title: 'Created From',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 200,
      render: (text) => {
        return (
          <div>
            {text}
          </div>
        )
      },
    }, {
      title: 'Check details & Operate files in disks',
      dataIndex: 'diskStateMap',
      key: 'diskStateMap',
      width: 350,
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
        return (
          <BackingImageActions {...backingImageActionsProps} selected={record} />
        )
      },
    },
  ]

  return (
    <div id="backingImageTable" style={{ flex: 1, height: '1px', overflow: 'hidden' }}>
      <Table
        className="backupImage-table-class"
        bordered={false}
        columns={columns}
        rowSelection={rowSelection}
        dataSource={dataSource}
        loading={loading}
        simple
        pagination={pagination}
        rowKey={record => record.id}
        scroll={{ x: 970, y: height }}
      />
    </div>
  )
}

list.propTypes = {
  loading: PropTypes.bool,
  dataSource: PropTypes.array,
  deleteBackingImage: PropTypes.func,
  showDiskStateMapDetail: PropTypes.func,
  rowSelection: PropTypes.object,
  height: PropTypes.number,
}

export default list

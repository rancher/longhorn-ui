import React from 'react'
import PropTypes from 'prop-types'
import { Table, Modal, Progress, Tooltip } from 'antd'
import DiskStateMapActions from './DiskStateMapActions'
import { ModalBlur, DropOption } from '../../components'
const confirm = Modal.confirm

const modal = ({
  visible,
  selected,
  backingImages,
  onCancel,
  deleteDisksOnBackingImage,
  selectedRows,
  rowSelection,
  diskStateMapDeleteDisabled,
  diskStateMapDeleteLoading,
}) => {
  const modalOpts = {
    title: 'Backing Image state in disks',
    visible,
    onCancel,
    hasOnCancel: true,
    width: 680,
    okText: 'Close',
    footer: null,
    bodyStyle: { padding: '0px' },
  }

  const handleMenuClick = (record, event) => {
    switch (event.key) {
      case 'delete':
        confirm({
          title: `Are you sure to delete the images image file from the disk ${record.disk} ?`,
          onOk() {
            deleteDisksOnBackingImage([record])
          },
        })
        break
      default:
    }
  }

  // update detail list
  let currentData = backingImages.find((item) => {
    return item.id === selected.id
  })

  const dataSource = currentData && currentData.diskStateMap ? Object.keys(currentData.diskStateMap).map((key) => {
    return {
      status: currentData.diskStateMap[key],
      disk: key,
      downloading: currentData.diskStateMap[key] && currentData.diskFileHandlingProgressMap && currentData.diskFileHandlingProgressMap[key] !== 'undefined' && currentData.diskStateMap[key] === 'in_progress',
      progress: currentData.diskFileHandlingProgressMap && currentData.diskFileHandlingProgressMap[key] ? parseInt(currentData.diskFileHandlingProgressMap[key], 10) : 0,
    }
  }) : []

  const columns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      className: 'active',
      render: (text, record) => {
        return (
          <div>
            { record.downloading ? <Tooltip title={`${record.progress}%`}><div><Progress showInfo={false} percent={record.progress} /></div></Tooltip> : ''}
            <div>{text}</div>
          </div>
        )
      },
    }, {
      title: 'Disk',
      dataIndex: 'disk',
      key: 'disk',
      render: (text) => {
        return (
          <div>{text}</div>
        )
      },
    }, {
      title: 'Operation',
      key: 'operation',
      width: 100,
      render: (text, record) => {
        return (
          <DropOption menuOptions={[
            { key: 'delete', name: 'Delete' },
          ]}
            onMenuClick={e => handleMenuClick(record, e)}
          />
        )
      },
    },
  ]

  const diskStateMapProps = {
    selectedRows,
    deleteButtonDisabled: diskStateMapDeleteDisabled,
    deleteButtonLoading: diskStateMapDeleteLoading,
    deleteDisksOnBackingImage,
  }

  const pagination = true

  return (
    <ModalBlur {...modalOpts}>
      <div style={{ width: '100%', overflow: 'auto', maxHeight: '500px', padding: '10px 20px 10px' }}>
        <div style={{ marginBottom: 12 }}>
          <DiskStateMapActions {...diskStateMapProps} />
        </div>
        <Table
          bordered={false}
          columns={columns}
          dataSource={dataSource}
          simple
          size="small"
          pagination={pagination}
          rowSelection={rowSelection}
          rowKey={record => record.disk}
        />
      </div>
    </ModalBlur>
  )
}

modal.propTypes = {
  visible: PropTypes.bool,
  diskStateMapDeleteDisabled: PropTypes.bool,
  diskStateMapDeleteLoading: PropTypes.bool,
  selected: PropTypes.object,
  backingImages: PropTypes.array,
  onCancel: PropTypes.func,
  selectedRows: PropTypes.array,
  deleteDisksOnBackingImage: PropTypes.func,
  rowSelection: PropTypes.object,
}

export default modal

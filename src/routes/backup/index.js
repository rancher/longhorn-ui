import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'dva'
import { Row, Col, Modal, Descriptions } from 'antd'
import BackupVolumeList from './BackupVolumeList'
import RestoreBackup from './RestoreBackup'
import CreateStandbyVolume from './CreateStandbyVolume'
import BulkCreateStandbyVolumeModal from './BulkCreateStandbyVolumeModal'
import { Filter } from '../../components/index'
import BackupBulkActions from './BackupBulkActions'
import WorkloadDetailModal from '../volume/WorkloadDetailModal'

const { confirm, info } = Modal

function Backup({ host, backup, loading, setting, backingImage, dispatch, location }) {
  location.search = location.search ? location.search : ''
  // currentItem || currentBackupVolume. The currentItem was a wrong decision at the beginning of the design. It was originally to simplify the transfer of attributes without complete assignment.
  // When backup supports ws, currentItem will be refactored to currentBackupVolume
  const { backupVolumes, sorter, restoreBackupFilterKey, currentItem, restoreBackupModalKey, createVolumeStandModalKey, bulkCreateVolumeStandModalKey, createVolumeStandModalVisible, bulkCreateVolumeStandModalVisible, lastBackupUrl, baseImage, size, restoreBackupModalVisible, selectedRows, isBulkRestore, bulkRestoreData, previousChecked, tagsLoading, nodeTags, diskTags, volumeName, backupVolumesForBulkCreate, workloadDetailModalVisible, WorkloadDetailModalKey, workloadDetailModalItem, currentBackupVolume } = backup
  const hosts = host.data
  const settings = setting.data
  const backingImages = backingImage.data
  const defaultReplicaCountSetting = settings.find(s => s.id === 'default-replica-count')
  const defaultNumberOfReplicas = defaultReplicaCountSetting !== undefined ? parseInt(defaultReplicaCountSetting.value, 10) : 3
  const showDeleteConfirm = (record) => {
    confirm({
      title: 'Are you sure delete all the backups?',
      content: 'If there is backup restore process in progress using the backups of this volume (including DR volumes), deleting the backup volume will result in restore failure and the volume in the restore process will become FAULTED. Are you sure you want to delete this backup volume?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        dispatch({
          type: 'backup/deleteAllBackups',
          payload: record.name,
        })
      },
    })
  }
  const showBackingImageInfo = (record) => {
    let content = record.backingImageName || record.backingImageURL ? (<Descriptions title="" bordered>
      <Descriptions.Item label={<div style={{ width: '150px' }}>Backing Image Name</div>} span={3}><div style={{ width: '280px' }}>{record.backingImageName}</div></Descriptions.Item>
      <Descriptions.Item label={<div style={{ width: '150px' }}>Backing Image Checksum</div>} span={3}><div style={{ width: '280px' }}>{record.backingImageChecksum}</div></Descriptions.Item>
    </Descriptions>) : (<div style={{ textAlign: 'center' }}>No Data</div>)
    info({
      title: 'Backing Image Info',
      content,
      okText: 'OK',
      width: 860,
    })
  }
  const backupVolumesProps = {
    backup: backupVolumes,
    search: location.search,
    loading,
    dispatch,
    onSorterChange(s) {
      dispatch({
        type: 'backup/updateSorter',
        payload: { field: s.field, order: s.order, columnKey: s.columnKey },
      })
    },
    Create(record) {
      dispatch({
        type: 'backup/CreateStandVolume',
        payload: record,
      })
    },
    DeleteAllBackups(record) {
      // dispatch({
      //   type: 'backup/CreateStandVolume',
      //   payload: record,
      // })
      showDeleteConfirm(record)
    },
    showBackingImageInfo(record) {
      showBackingImageInfo(record)
    },
    restoreLatestBackup(record) {
      dispatch({
        type: 'backup/queryBackupDetailData',
        payload: {
          url: record.actions.backupList,
          lastBackupName: record.lastBackupName,
          numberOfReplicas: defaultNumberOfReplicas,
          backingImage: record.backingImageName,
        },
      })
    },
    showWorkloadsStatusDetail(record) {
      dispatch({
        type: 'backup/showWorkloadDetailModal',
        payload: record,
      })
    },
    onRowClick(record, flag) {
      let selecteRowByClick = [record]

      if (flag) {
        selectedRows.forEach((item) => {
          if (selecteRowByClick.every((ele) => {
            return ele.id !== item.id
          })) {
            selecteRowByClick.push(item)
          } else {
            selecteRowByClick = selecteRowByClick.filter((ele) => {
              return ele.id !== item.id
            })
          }
        })
      }

      dispatch({
        type: 'backup/changeSelection',
        payload: {
          selectedRows: selecteRowByClick,
        },
      })
    },
    rowSelection: {
      selectedRowKeys: selectedRows.map(item => item.id),
      onChange(_, records) {
        dispatch({
          type: 'backup/changeSelection',
          payload: {
            selectedRows: records,
          },
        })
      },
    },
    sorter,
  }

  const volumeFilterProps = {
    location,
    fieldOption: [
      { value: 'name', name: 'Name' },
    ],
    onSearch(filter) {
      dispatch({
        type: 'backup/filterBackupVolumes',
        payload: filter,
      })
    },
  }

  const restoreBackupModalProps = {
    item: currentItem,
    hosts,
    tagsLoading,
    nodeTags,
    diskTags,
    backingImages,
    previousChecked,
    isBulk: isBulkRestore,
    visible: restoreBackupModalVisible,
    onOk(selectedBackup) {
      if (isBulkRestore) {
        dispatch({
          type: 'backup/restoreBulkBackup',
          payload: {
            bulkRestoreData,
            selectedBackup,
          },
        })
      } else {
        dispatch({
          type: 'backup/restore',
          payload: selectedBackup,
        })
      }
    },
    setPreviousChange(checked) {
      dispatch({
        type: 'backup/setPreviousChange',
        payload: checked,
      })
    },
    onCancel() {
      dispatch({
        type: 'backup/hideRestoreBackupModal',
      })
    },
  }

  const backupBulkActionsProps = {
    selectedRows,
    restoreLatestBackup() {
      dispatch({
        type: 'backup/queryBackupDetailBulkData',
        payload: {
          selectedRows,
          numberOfReplicas: defaultNumberOfReplicas,
        },
      })
    },
    showBulkCreateDisasterRecoveryVolume() {
      dispatch({
        type: 'backup/BulkCreateStandVolume',
        payload: selectedRows,
      })
    },
  }

  const createVolumeStandModalProps = {
    item: {
      numberOfReplicas: defaultNumberOfReplicas,
      size,
      iops: 1000,
      baseImage,
      fromBackup: lastBackupUrl,
      name: volumeName,
      backingImage: currentBackupVolume ? currentBackupVolume.backingImageName : '',
    },
    visible: createVolumeStandModalVisible,
    nodeTags,
    diskTags,
    tagsLoading,
    backingImages,
    onOk(newVolume) {
      let data = Object.assign(newVolume, { standby: true, frontend: '' })
      data.size = data.size.replace(/\s/ig, '')
      dispatch({
        type: 'backup/createVolume',
        payload: data,
      })
    },
    onCancel() {
      dispatch({
        type: 'backup/hideCreateVolumeStandModalVisible',
      })
    },
  }

  const bulkCreateVolumeStandModalProps = {
    items: backupVolumesForBulkCreate.map((item) => ({
      size: item.size,
      // baseImage: item.baseImage,
      fromBackup: item.lastBackupUrl,
      name: item.volumeName,
    })),
    numberOfReplicas: defaultNumberOfReplicas,
    visible: bulkCreateVolumeStandModalVisible,
    nodeTags,
    diskTags,
    tagsLoading,
    backingImages,
    onOk(params, newVolumes) {
      let data = newVolumes.map((item) => ({
        ...item,
        ...params,
        standby: true,
        frontend: '',
        size: item.size.replace(/\s/ig, ''),
      }))
      dispatch({
        type: 'backup/bulkCreateVolume',
        payload: data,
      })
    },
    onCancel() {
      dispatch({
        type: 'backup/hideBulkCreateVolumeStandModalVisible',
      })
    },
  }

  const workloadDetailModalProps = {
    visible: workloadDetailModalVisible,
    item: workloadDetailModalItem,
    onOk() {
      dispatch({ type: 'backup/hideWorkloadDetailModal' })
    },
    onCancel() {
      dispatch({ type: 'backup/hideWorkloadDetailModal' })
    },
  }

  return (
    <div className="content-inner" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible !important' }}>
      <Row gutter={24}>
        <Col lg={18} md={16} sm={24} xs={24}>
          <BackupBulkActions {...backupBulkActionsProps} />
        </Col>
        <Col lg={6} md={8} sm={24} xs={24} style={{ marginBottom: 16 }}>
          <Filter key={restoreBackupFilterKey} {...volumeFilterProps} />
        </Col>
      </Row>
      <BackupVolumeList {...backupVolumesProps} />
      { restoreBackupModalVisible ? <RestoreBackup key={restoreBackupModalKey} {...restoreBackupModalProps} /> : ''}
      { createVolumeStandModalVisible ? <CreateStandbyVolume key={createVolumeStandModalKey} {...createVolumeStandModalProps} /> : ''}
      { bulkCreateVolumeStandModalVisible ? <BulkCreateStandbyVolumeModal key={bulkCreateVolumeStandModalKey} {...bulkCreateVolumeStandModalProps} /> : ''}
      { workloadDetailModalVisible ? <WorkloadDetailModal key={WorkloadDetailModalKey} {...workloadDetailModalProps} /> : ''}
    </div>
  )
}

Backup.propTypes = {
  backup: PropTypes.object,
  location: PropTypes.object,
  dispatch: PropTypes.func,
  loading: PropTypes.bool,
  host: PropTypes.object,
  setting: PropTypes.object,
  backingImage: PropTypes.object,
  nodeTags: PropTypes.array,
  diskTags: PropTypes.array,
  tagsLoading: PropTypes.bool,
}

export default connect(({ host, backup, setting, backingImage, loading }) => ({ host, backup, setting, backingImage, loading: loading.models.backup }))(Backup)

import React from 'react'
import PropTypes from 'prop-types'
import { Alert, Icon, Tag, Progress, Tooltip } from 'antd'
import moment from 'moment'
import classnames from 'classnames'
import { formatMib, utcStrToDate } from '../../../utils/formater'
import { isSchedulingFailure, getHealthState, needToWaitDone, frontends, extractImageVersion } from '../helper/index'
import styles from './VolumeInfo.less'
import { EngineImageUpgradeTooltip, ReplicaHATooltip } from '../../../components'
import IconSnapshot from '../../../components/Icon/IconSnapshot'
import { isVolumeImageUpgradable, isVolumeReplicaNotRedundancy, isVolumeRelicaLimited } from '../../../utils/filter'

function VolumeInfo({ selectedVolume, snapshotModalState, engineImages, hosts, currentBackingImage }) {
  let errorMsg = null
  const state = snapshotModalState

  const attchedNodeIsDown = selectedVolume.state === 'attached' && selectedVolume.robustness === 'unknown' && hosts && hosts.some((host) => {
    return selectedVolume.controllers && selectedVolume.controllers[0] && host.id === selectedVolume.controllers[0].hostId && host.conditions && host.conditions.Ready && host.conditions.Ready.status === 'False'
  })

  const dataLocalityWarn = selectedVolume.dataLocality === 'best-effort' && selectedVolume.state === 'attached' && selectedVolume.replicas && selectedVolume.replicas.every((item) => {
    let attachedNode = selectedVolume.controllers && selectedVolume.controllers[0] && selectedVolume.controllers[0].hostId ? selectedVolume.controllers[0].hostId : ''

    return item.hostId !== attachedNode
  })

  if (isSchedulingFailure(selectedVolume)) {
    errorMsg = (
      <Alert
        message="Scheduling Failure"
        description={selectedVolume.conditions.scheduled.reason.replace(/([A-Z])/g, ' $1')}
        type="warning"
        className="ant-alert-error"
        showIcon
      />
    )
  }
  const computeActualSize = selectedVolume && selectedVolume.controllers && selectedVolume.controllers[0] && selectedVolume.controllers[0].actualSize ? selectedVolume.controllers[0].actualSize : ''
  const defaultImage = engineImages.find(image => image.default === true)
  const healthState = getHealthState(selectedVolume.robustness)
  const accessModeObject = {
    rwo: 'ReadWriteOnce',
    rwx: 'ReadWriteMany',
  }
  let upgrade = ''
  let ha = ''
  if (isVolumeImageUpgradable(selectedVolume, defaultImage)) {
    const currentVersion = extractImageVersion(selectedVolume.currentImage)
    const latestVersion = extractImageVersion(defaultImage.image)
    upgrade = (<EngineImageUpgradeTooltip currentVersion={currentVersion} latestVersion={latestVersion} />)
  }
  if (isVolumeReplicaNotRedundancy(selectedVolume)) {
    ha = (<ReplicaHATooltip type="danger" />)
  } else if (isVolumeRelicaLimited(selectedVolume)) {
    ha = (<ReplicaHATooltip type="warning" />)
  }
  let podList = ''
  if (selectedVolume.kubernetesStatus.workloadsStatus) {
    podList = selectedVolume.kubernetesStatus.workloadsStatus.map((item, index) => {
      return (
        <div key={index} style={{ border: '1px solid #f4f4f4', marginBottom: '10px' }}>
          <div className={styles.row}>
            <span className={styles.label}>{selectedVolume.kubernetesStatus.lastPodRefAt ? 'Last ' : ''} Pod Name:</span>
            {item.podName}
          </div>
          {!selectedVolume.kubernetesStatus.lastPodRefAt ? <div className={styles.row}>
              <span className={styles.label}> Pod Status:</span>
              {item.podStatus}
            </div> : ''
          }
          <div className={styles.row}>
            <span className={styles.label}>{selectedVolume.kubernetesStatus.lastPodRefAt ? 'Last ' : ''} Workload Name:</span>
            {item.workloadName}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{selectedVolume.kubernetesStatus.lastPodRefAt ? 'Last ' : ''} Workload Type:</span>
            {item.workloadType}
          </div>
        </div>
      )
    })
  }

  let forMapNode = (tag, index) => {
    return (
      <Tag key={index} color="rgb(39, 174, 95)">
        {tag}
      </Tag>
    )
  }

  let forMapDisk = (tag, index) => {
    return (
      <Tag key={index} color="#862493">
        {tag}
      </Tag>
    )
  }
  let tagDiskChild = ''
  if (selectedVolume.diskSelector) {
    tagDiskChild = selectedVolume.diskSelector.map(forMapDisk)
  }

  let tagNodeChild = ''
  if (selectedVolume.diskSelector && selectedVolume.nodeSelector) {
    tagNodeChild = selectedVolume.nodeSelector.map(forMapNode)
  }

  // resotring progress
  let restoreProgress = null
  if (selectedVolume.restoreStatus && selectedVolume.restoreStatus.length > 0) {
    let total = 0
    let restoreErrorMsg = ''
    let isRestoring = false
    selectedVolume.restoreStatus.forEach((ele) => {
      if (ele.error) {
        restoreErrorMsg = ele.error
      }
      if (ele.isRestoring) {
        isRestoring = ele.isRestoring
      }
      total += ele.progress
    })
    let progress = Math.floor(total / selectedVolume.restoreStatus.length)

    if (!isRestoring && !restoreErrorMsg) {
      restoreProgress = ''
    } else if (isRestoring && !restoreErrorMsg) {
      restoreProgress = <div className={styles.row} style={{ display: 'flex' }}><span className={styles.label}> Restoring:</span> <div style={{ width: '80%' }}> <Progress percent={progress} /> </div></div>
    } else {
      restoreProgress = <div className={styles.row} style={{ display: 'flex' }}><span className={styles.label}> Restoring:</span> <div style={{ width: '80%' }}><Tooltip title={restoreErrorMsg}><Progress status="exception" percent={progress} /></Tooltip></div> </div>
    }
  }

  const volumeSizeEle = () => {
    let oldSize = selectedVolume && selectedVolume.controllers && selectedVolume.controllers[0] && selectedVolume.controllers[0].size ? selectedVolume.controllers[0].size : ''
    let isExpanding = (selectedVolume.size !== oldSize && selectedVolume.state === 'attached')
    let message = `The volume is in expansion progress from size ${formatMib(oldSize)} to size ${formatMib(selectedVolume.size)}`

    return (<div style={{ display: 'inline-block' }}>
      {isExpanding ? <Tooltip title={message}>
        <div style={{ position: 'relative', color: 'rgb(16, 142, 233)' }}>
          <div className={styles.expendVolumeIcon}>
            <Icon type="loading" />
          </div>
          <div style={{ fontSize: '20px' }}>
            <Icon type="arrows-alt" style={{ transform: 'rotate(45deg)' }} />
          </div>
        </div>
      </Tooltip> : <div>{formatMib(selectedVolume.size)}</div>}
    </div>)
  }

  return (
    <div>
      {errorMsg}
      {restoreProgress}
      <div className={styles.row}>
        <span className={styles.label}> State:</span>
        <span className={classnames({ [selectedVolume.state.toLowerCase()]: true, capitalize: true }, styles.volumeState)}>
          {upgrade} {selectedVolume.state.hyphenToHump()} {needToWaitDone(selectedVolume.state, selectedVolume.replicas) ? <Icon type="loading" /> : null}
        </span>
      </div>
      <div className={styles.row} style={{ display: 'flex', alignItems: 'center' }}>
        <span className={styles.label}> Health:</span>
        {attchedNodeIsDown ? <Tooltip title={'The attached node is down'}><Icon className="faulted" style={{ transform: 'rotate(45deg)', marginRight: 8 }} type="api" /></Tooltip> : ''}
        <span className={classnames({ [selectedVolume.robustness.toLowerCase()]: true, capitalize: true }, styles.volumeState)}>
          {ha} {healthState}
        </span>
        {dataLocalityWarn ? <Tooltip title={'Volume does not have data locality! There is no healthy replica on the same node as the engine'}><Icon style={{ fontSize: '16px', marginLeft: 6 }} className="color-warning" type="warning" /></Tooltip> : ''}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Ready for workload:</span>
        {selectedVolume.ready ? <span className="healthy">Ready</span> : <Tooltip title={`Not ready for workload. ${selectedVolume.robustness === 'faulted' ? 'Volume Faulted' : 'Volume may be under maintenance or in the restore process.'} `}><span className="faulted">Not Ready</span></Tooltip>}
      </div>
      <div className={styles.row}>
        <div className={styles.formItem} style={{ display: 'flex' }}>
          <span className={styles.label}>
            Conditions:
          </span>
          <div className={styles.control} style={{ display: 'flex' }}>
            {selectedVolume && selectedVolume.conditions && Object.keys(selectedVolume.conditions).filter((key) => {
              return key === 'restore' || key === 'scheduled' || key === 'toomanysnapshots'
            }).map((key) => {
              let title = selectedVolume.conditions[key] ? (<div>
                {selectedVolume.conditions[key].type && <div style={{ marginBottom: 5 }}>Name: {selectedVolume.conditions[key].type}</div>}
                {selectedVolume.conditions[key].lastProbeTime && <div style={{ marginBottom: 5 }}>Last Probe Time: {moment(selectedVolume.conditions[key].lastProbeTime).fromNow()}</div>}
                {selectedVolume.conditions[key].lastTransitionTime && <div style={{ marginBottom: 5 }}>Last Transition Time: {moment(selectedVolume.conditions[key].lastTransitionTime).fromNow()}</div>}
                {selectedVolume.conditions[key].message && <div style={{ marginBottom: 5 }}>Message: {selectedVolume.conditions[key].message}</div>}
                {selectedVolume.conditions[key].reason && <div style={{ marginBottom: 5 }}>Reason: {selectedVolume.conditions[key].reason}</div>}
                {selectedVolume.conditions[key].status && <div style={{ marginBottom: 5 }}>Status: {selectedVolume.conditions[key].status}</div>}
              </div>) : ''
              let icon = ''
              if (key === 'toomanysnapshots') {
                if (selectedVolume.conditions[key] && selectedVolume.conditions[key].status && (selectedVolume.conditions[key].status.toLowerCase() === 'false' || selectedVolume.conditions[key].reason === '')) {
                  icon = <IconSnapshot fill="#27ae60" />
                  title = (<div>
                    {selectedVolume.conditions[key].type && <div style={{ marginBottom: 5 }}>Name: {selectedVolume.conditions[key].type}</div>}
                    {selectedVolume.conditions[key].lastTransitionTime && <div style={{ marginBottom: 5 }}>Last Transition Time: {moment(selectedVolume.conditions[key].lastTransitionTime).fromNow()}</div>}
                    <div style={{ marginBottom: 5 }}>Status: The snapshot number threshold has not been exceeded</div>
                  </div>)
                } else {
                  icon = <IconSnapshot fill="#f15354" />
                }
              } else if (key === 'restore') {
                icon = selectedVolume.conditions[key].status && (selectedVolume.conditions[key].status.toLowerCase() === 'true' || selectedVolume.conditions[key].reason === '') ? <Icon className="healthy" style={{ marginRight: 5, color: selectedVolume.conditions[key].reason === '' && selectedVolume.conditions[key].status.toLowerCase() === 'false' ? '#666666' : '#27ae60' }} type="check-circle" /> : <Icon className="faulted" style={{ marginRight: 5 }} type="exclamation-circle" />
              } else {
                icon = selectedVolume.conditions[key].status && selectedVolume.conditions[key].status.toLowerCase() === 'true' ? <Icon className="healthy" style={{ marginRight: 5 }} type="check-circle" /> : <Icon className="faulted" style={{ marginRight: 5 }} type="exclamation-circle" />
              }
              let text = key !== 'toomanysnapshots' ? selectedVolume.conditions[key].type : ''

              return (<Tooltip key={key} title={title}><div style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
                  {icon}{text}
                </div></Tooltip>)
            })}
            </div>
        </div>
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Frontend:</span>
        {(frontends.find(item => item.value === selectedVolume.frontend) || '').label}
      </div>
      {!selectedVolume.disableFrontend ? <div className={styles.row}>
        <span className={styles.label}> Attached Node &amp; Endpoint:</span>
        {selectedVolume.controllers ? selectedVolume.controllers.filter(item => item.hostId !== '' && item.endpoint !== '').map(item => <div style={{ fontFamily: 'monospace', margin: '2px 0px' }} key={item.hostId}>{item.hostId} <br /> <span style={{ backgroundColor: '#f2f4f5' }}> {item.endpoint} </span></div>) : ''}
      </div> : <div className={styles.row}>
        <span className={styles.label}> Attached Node:</span>
        {selectedVolume.controllers ? selectedVolume.controllers.filter(item => item.hostId !== '').map(item => <div style={{ fontFamily: 'monospace', margin: '2px 0px' }} key={item.hostId}>{item.hostId}</div>) : ''}
      </div>}
      <div className={styles.row}>
        <span className={styles.label}> Size:</span>
        {/* {formatMib(selectedVolume.size)} */}
        {volumeSizeEle()}
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Actual Size:</span>
        {state ? formatMib(computeActualSize) : 'Unknown'}
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Data Locality:</span>
        {selectedVolume.dataLocality}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Access Mode:</span>
        {accessModeObject[selectedVolume.accessMode] ? accessModeObject[selectedVolume.accessMode] : ''}
      </div>
      {currentBackingImage ? <div>
        <div className={styles.row}>
          <span className={styles.label}> Backing Image:</span>
          {selectedVolume.backingImage}
        </div>
        <div className={styles.row}>
          <span className={styles.label}> Backing Image Size:</span>
          {formatMib(currentBackingImage.size)}
        </div>
      </div> : ''}
      <div className={styles.row}>
        <Tooltip title={'Provides the binary to start and communicate with the volume engine/replicas.'}>
          <span className={styles.label}> Engine Image:</span>
        </Tooltip>
        {selectedVolume.engineImage}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Created:</span>
        {moment(utcStrToDate(selectedVolume.created)).fromNow()}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Node Tags:</span>
        {tagNodeChild}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Disk Tags:</span>
        {tagDiskChild}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Last Backup:</span>
        {selectedVolume.lastBackup}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Last Backup At:</span>
        {selectedVolume.lastBackupAt ? moment(selectedVolume.lastBackupAt).fromNow() : ''}
      </div>
      <div className={styles.row}>
        <span className={styles.label}> Replicas Auto Balance:</span>
        {selectedVolume.replicaAutoBalance ? selectedVolume.replicaAutoBalance : ''}
      </div>
      <div className={styles.row}>
        <Tooltip title={'Manages the engine/replica instances’ life cycle on the node.'}>
          <span className={styles.label}> Instance Manager:</span>
        </Tooltip>
        {selectedVolume.controllers ? selectedVolume.controllers.filter(item => item.instanceManagerName !== '').map(item => <div key={item.hostId} style={{ fontFamily: 'monospace', margin: '2px 0px' }}> <span style={{ backgroundColor: '#f2f4f5' }}> {item.instanceManagerName} </span></div>) : ''}
      </div>
      { selectedVolume.kubernetesStatus ? <div>
          { selectedVolume.kubernetesStatus.lastPVCRefAt ? <div className={styles.row}>
              <span className={styles.label}> Last time bound with PVC:</span>
              {selectedVolume.kubernetesStatus.lastPVCRefAt ? moment(new Date(selectedVolume.kubernetesStatus.lastPVCRefAt)).fromNow() : ''}
            </div> : ''
          }
          {selectedVolume.kubernetesStatus.lastPodRefAt ? <div className={styles.row}>
              <span className={styles.label}> Last time used by Pod:</span>
              {selectedVolume.kubernetesStatus.lastPodRefAt ? moment(new Date(selectedVolume.kubernetesStatus.lastPodRefAt)).fromNow() : ''}
            </div> : ''
          }
          <div className={styles.row}>
            <span className={styles.label}>{ selectedVolume.kubernetesStatus.lastPVCRefAt ? 'Last' : ''} Namespace:</span>
            {selectedVolume.kubernetesStatus.namespace}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{ selectedVolume.kubernetesStatus.lastPVCRefAt ? 'Last Bounded' : ''} PVC Name:</span>
            {selectedVolume.kubernetesStatus.pvcName}
          </div>
          <div className={styles.row}>
            <span className={styles.label}> PV Name:</span>
            {selectedVolume.kubernetesStatus.pvName}
          </div>
          <div className={styles.row}>
            <span className={styles.label}> PV Status:</span>
            {selectedVolume.kubernetesStatus.pvStatus}
          </div>
          <div className={styles.row}>
            <span className={styles.label}> Revision Counter:</span>
            {selectedVolume.revisionCounterDisabled ? 'True' : 'False'}
          </div>
          {podList}
        </div>
        : ''
      }
    </div>
  )
}

VolumeInfo.propTypes = {
  backupStatus: PropTypes.object,
  selectedVolume: PropTypes.object,
  queryBackupStatus: PropTypes.func,
  clearBackupStatus: PropTypes.func,
  snapshotModal: PropTypes.object,
  snapshotModalState: PropTypes.bool,
  engineImages: PropTypes.array,
  currentBackingImage: PropTypes.object,
  hosts: PropTypes.array,
}

export default VolumeInfo

import React from 'react'
import PropTypes from 'prop-types'
import { Card, Modal, Tooltip, Progress, Icon } from 'antd'
import { DropOption } from '../../components'
import diskHealthyImage from '../../assets/images/disk-healthy.png'
import diskUnhealthyImage from '../../assets/images/disk-unhealthy.png'
const confirm = Modal.confirm

class Replica extends React.Component {
  state = {}

  getReplicaShortName = (name) => {
    let tokens = name.split('-')
    return tokens.slice(tokens.length - 3, tokens.length).join('-')
  }

  handleMenuClick = (record, event) => {
    const { deleteReplicas } = this.props
    switch (event.key) {
      case 'delete':
        confirm({
          title: `Are you sure you want to delete replica ${record.name} ?`,
          onOk() {
            deleteReplicas([record])
          },
        })
        break
      default:
    }
  }

  get modeInfo() {
    // Replica mode: RW (normal/healthy),
    // WO(rebuilding, probably yellow),
    // ERR (fault, can be treated the same with FailedAt set).
    const { item: { mode, failedAt } } = this.props
    const m = mode.toLowerCase()
    const out = {
      color: 'lightgrey',
      text: '',
    }
    if (m === 'rw') {
      out.color = '#862493'
      out.text = 'Healthy'
    } else if (m === 'wo') {
      out.color = '#f1c40f'
      out.text = 'Rebuilding...'
    } else if (m === 'err' || failedAt !== '') {
      out.color = '#f15354'
      out.text = 'Failed'
    }
    return out
  }

  render() {
    const { item, hosts, restoreStatus, rebuildStatus, purgeStatus } = this.props

    const host = hosts.find(h => h.id === item.hostId)
    let deleteTooltip = ''
    if (item.volState === 'detached' && item.volState !== 'attached') {
      deleteTooltip = `Replica belongs to volume currently ${item.volState}. Volume must be attached or detached.`
    }
    const restoreProgress = (name, arr, state) => {
      let total = 0
      let progress = 0
      let rebuildError = ''
      let progressArr = arr.filter((ele) => {
        return ele.replica === name
      })

      progressArr.forEach((ele) => {
        total += ele.progress
        rebuildError = ele.error
      })

      if (progressArr && progressArr.length > 0) {
        progress = Math.floor(total / progressArr.length)
      }
      if (rebuildError) {
        return <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: '20px' }}><Tooltip title={rebuildError}><Icon style={{ color: '#faad14' }} type="warning" /></Tooltip></div>
      } else {
        return progress === 0 || progress === 100 ? '' : <Tooltip title={`${state === 'restore' ? 'Restoring' : 'Deleting Snapshot'} ${progress}%`}><Progress status={state === 'restore' ? 'success' : 'exception'} percent={progress} showInfo={false} /></Tooltip>
      }
    }

    const fromReplica = (arr) => {
      let fromReplicas = arr.filter((ele) => {
        return ele.isRebuilding && ele.state === 'in_progress' && ele.fromReplica
      })

      if (fromReplicas.length > 0) {
        return <div> Synchronizing from Replica: {fromReplicas.map((r) => r.fromReplica).join(', ')}</div>
      } else {
        return ''
      }
    }

    const rebuildProgress = (name, arr, state) => {
      let total = 0
      let progress = 0
      let restoreError = ''
      let progressArr = arr.filter((ele) => {
        return ele.replica === name
      })

      progressArr.forEach((ele) => {
        total += ele.progress
        restoreError = ele.error
      })

      if (progressArr && progressArr.length > 0) {
        progress = Math.floor(total / progressArr.length)
      }
      if (restoreError) {
        return <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: '20px' }}><Tooltip title={restoreError}><Icon style={{ color: '#faad14' }} type="warning" /></Tooltip></div>
      } else {
        return progress === 0 || progress === 100 ? '' : <Tooltip title={<div>{state} {progress}% {fromReplica(progressArr)}</div>}><Progress status={'success'} percent={progress} showInfo={false} /></Tooltip>
      }
    }

    return (
      <div style={{ display: 'inline-block', padding: '4px 20px' }} key={item.name}>
        <Card bodyStyle={{ height: 280, padding: 0 }}>
          <div style={{ position: 'relative', backgroundColor: this.modeInfo.color, padding: 20, color: 'white' }}>
            <img
              alt="replica"
              style={{ display: 'inline' }}
              width="70px"
              src={item.running ? diskHealthyImage : diskUnhealthyImage}
              />
            <span style={{ marginLeft: 20, verticalAlign: '100%', fontSize: 15 }}>
              {this.getReplicaShortName(item.name)}
              {host && (host.region || host.zone) ? <Tooltip title={<span> region: {host.region} <br></br> zone: {host.zone} </span>}><Icon style={{ marginLeft: '5px' }} type="environment" /></Tooltip> : '' }
            </span>
            <div style={{ width: '50%', position: 'absolute', top: '57px', left: '44%', height: '44px', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
              {restoreProgress(item.name, restoreStatus, 'restore')}
              {restoreProgress(item.name, purgeStatus, 'purge')}
              {rebuildProgress(item.name, rebuildStatus, 'Rebuilding')}
            </div>
            <p style={{ position: 'absolute', left: 112, bottom: 20, verticalAlign: '100%' }}>
              {this.modeInfo.text}
            </p>
          </div>
          <div style={{ textAlign: 'center', marginTop: item.instanceManagerName ? '10px' : '32px', marginBottom: item.instanceManagerName ? '0px' : '10px' }}>
            <h3>{(host && host.name) || 'N/A'}</h3>
            <div style={{ color: 'gray' }}>Node</div>
          </div>
          { item.instanceManagerName ? <div style={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px', padding: '0px 5px' }}>
              <Tooltip title={'Instance Manager'}>
                {item.instanceManagerName}
              </Tooltip>
            </div> : ''
          }
          <div style={{ textAlign: 'center' }}>
            <Tooltip title={(item && item.dataPath) || 'N/A'}>
              <h3>{(item && item.diskPath) || 'N/A'}</h3>
            </Tooltip>
          </div>
          <span style={{ position: 'absolute', bottom: 20, left: 20 }} className={item.running ? 'healthy' : 'stopped'}>
            {item.running ? 'Running' : 'Stopped'}
          </span>
          <span style={{ position: 'absolute', bottom: 18, right: 10 }}>
            <DropOption menuOptions={[
              { key: 'delete', name: 'Delete', disabled: deleteTooltip !== '', tooltip: deleteTooltip },
            ]}
              onMenuClick={e => this.handleMenuClick(item, e)}
            />
          </span>
          {!item.running && <div style={{
            height: '5px',
            width: '100%',
            background: 'rgba(15,15,15,.925)',
            position: 'absolute',
            bottom: 0,
          }} />}
        </Card>
      </div>
    )
  }
}

Replica.propTypes = {
  item: PropTypes.object.isRequired,
  deleteReplicas: PropTypes.func,
  hosts: PropTypes.array,
  restoreStatus: PropTypes.array,
  rebuildStatus: PropTypes.array,
  purgeStatus: PropTypes.array,
}

export default Replica

import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import moment from 'moment'
import { ModalBlur } from '../../components'
import style from './Salvage.less'
import diskUnhealthyImage from '../../assets/images/disk-unhealthy.png'

const getReplicaShortName = (name) => {
  const ary = name.split('-')
  const len = ary.length
  return ary.slice(len - 3, len).join('-')
}

const Replica = ({ item, toggleSelect, selected, hosts }) => {
  const cNames = classnames(style.replica, { [style.selected]: selected })
  const failedAt = item.failedAt ? moment(new Date(item.failedAt).getTime()).fromNow() : 'N/A'
  const host = hosts.find(h => h.id === item.hostId)
  return (
    <div onClick={() => toggleSelect(item.name)} className={cNames}>
      <div className={style.header} style={{ backgroundColor: item.running ? '#862493' : 'lightgrey', padding: 14 }}>
        <div>
          <img
            alt="replica"
            className={style.icon}
            src={diskUnhealthyImage}
            />
        </div>
        <span style={{ marginLeft: 20, verticalAlign: '100%', fontSize: 15, color: 'white' }}>
          {getReplicaShortName(item.name)}
        </span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 15 }}>
        <h3>{(host && host.name) || 'N/A'}</h3>
        <p style={{ color: 'gray' }}>Host</p>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }} className="faulted">
        Failed At: {failedAt}
      </div>
    </div>
  )
}

Replica.propTypes = {
  item: PropTypes.object.isRequired,
  toggleSelect: PropTypes.func.isRequired,
  selected: PropTypes.bool.isRequired,
  hosts: PropTypes.array,
}

class Salvage extends React.Component {
  state = {
    selectedReplicaMap: {},
    showErrorMessage: false,
  }

  toggleSelect = name => {
    const map = this.state.selectedReplicaMap
    this.setState({
      ...this.state,
      selectedReplicaMap: { ...map, [name]: !map[name] },
    })
  }

  get selectedReplicaNames() {
    const map = this.state.selectedReplicaMap
    return Object.keys(map)
      .filter(k => map[k])
  }

  timer = null

  clearErrorMessage = () => {
    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => {
      this.setState({
        showErrorMessage: false,
      })
    }, 4000)
  }

  render() {
    const {
      hosts,
      item,
      visible,
      onCancel,
      onOk,
    } = this.props

    const handleOk = () => {
      if (this.selectedReplicaNames.length > 0) {
        onOk(this.selectedReplicaNames, item.actions.salvage)
        this.setState({ ...this.state, selectedReplicaMap: {} })
        return true
      }
      this.setState({
        showErrorMessage: true,
      })
      this.clearErrorMessage()
      return false
    }

    const handleCancel = () => {
      onCancel()
      this.setState({ ...this.state, showErrorMessage: false, selectedReplicaMap: {} })
    }

    const modalOpts = {
      title: 'Select one or more replicas to salvage',
      visible,
      onCancel: handleCancel,
      width: 1040,
      onOk: handleOk,
    }

    if (!item) {
      return null
    }

    const replicas = item.replicas.map(r => (
      <Replica
        selected={!!this.state.selectedReplicaMap[r.name]}
        toggleSelect={this.toggleSelect}
        key={r.name}
        item={r}
        hosts={hosts}
      />
    ))

    return (
      <ModalBlur {...modalOpts}>
        <div className={style.replicaList}>
          {replicas}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p>
            <span className="healthy"> {this.selectedReplicaNames.length} </span>
             replicas selected
          </p>
          {
            this.state.showErrorMessage && this.selectedReplicaNames.length === 0 ? <p className="faulted">Plase select at least one replica.</p> : null
          }
        </div>
      </ModalBlur>
    )
  }
}

Salvage.propTypes = {
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  item: PropTypes.object,
  onOk: PropTypes.func,
  hosts: PropTypes.array,
}

export default Salvage

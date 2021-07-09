import React from 'react'
import PropTypes from 'prop-types'
import CountUp from 'react-countup'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './resource.less'

const countUpProps = {
  start: 0,
  duration: 2.75,
  useEasing: true,
  useGrouping: true,
  separator: ',',
}

function Resource({ total, used, data }) {
  const COLORS = ['#3D1135', '#862493']
  return (<div className={styles.resource}>
    <ResponsiveContainer minHeight={200}>
      <PieChart>
        <Pie data={data}
          innerRadius={40}
          outerRadius={80}
          fill="#8884d8"
        >
          {
            data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)
          }
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
    <div className={styles.number}>
      <div className={styles.item}>
        <p>Used</p>
        <p>
          <CountUp
            end={used}
            suffix="GB"
            {...countUpProps}
          />
        </p>
      </div>
      <div className={styles.item}>
        <p>Total</p>
        <p>
          <CountUp
            end={total}
            suffix="GB"
            {...countUpProps}
          />
        </p>
      </div>
    </div>
  </div>)
}

Resource.propTypes = {
  data: PropTypes.array,
  total: PropTypes.number,
  used: PropTypes.number,
}

export default Resource

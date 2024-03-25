import { Fragment } from 'react'
import type { AbiItem, AbiParameter } from 'viem'

type FormattedAbiItemProps = {
  abiItem: AbiItem
  compact?: boolean
  showIndexed?: boolean
  showParameterNames?: boolean
  showStateMutability?: boolean
  showReturns?: boolean
  showType?: boolean
}

export function FormattedAbiItem(props: FormattedAbiItemProps) {
  const {
    abiItem,
    compact,
    showIndexed = true,
    showParameterNames = true,
    showStateMutability = true,
    showReturns = true,
    showType = true,
  } = props

  return (
    <span className="font-mono">
      {abiItem.type === 'function' && (
        <>
          {showType && <span className="text-gray-700">function </span>}
          {abiItem.name && <span>{abiItem.name}</span>}(
          {abiItem.inputs && (
            <FormattedAbiParameters
              params={abiItem.inputs}
              showNames={showParameterNames}
            />
          )}
          )
          {showStateMutability &&
            abiItem.stateMutability &&
            abiItem.stateMutability !== 'nonpayable' && (
              <span> {abiItem.stateMutability} </span>
            )}
          {showReturns && abiItem.outputs?.length > 0 && (
            <>
              {' '}
              returns (
              <FormattedAbiParameters
                compact={compact}
                params={abiItem.outputs}
                showNames={showParameterNames}
              />
              )
            </>
          )}
        </>
      )}
      {abiItem.type === 'event' && (
        <>
          {showType && <span className="text-gray-700">event </span>}
          {abiItem.name && <span>{abiItem.name}</span>}(
          {abiItem.inputs && (
            <FormattedAbiParameters
              compact={compact}
              params={abiItem.inputs}
              showIndexed={showIndexed}
              showNames={showParameterNames}
            />
          )}
          )
        </>
      )}
      {abiItem.type === 'error' && (
        <>
          {showType && <span className="text-gray-700">error </span>}
          {abiItem.name && <span>{abiItem.name}</span>}((
          {abiItem.inputs && (
            <FormattedAbiParameters
              compact={compact}
              params={abiItem.inputs}
              showNames={showParameterNames}
            />
          )}
          )
        </>
      )}
      {abiItem.type === 'constructor' && (
        <>
          <span className="text-gray-700">constructor</span>(
          {abiItem.inputs && (
            <FormattedAbiParameters
              compact={compact}
              params={abiItem.inputs}
              showNames={showParameterNames}
            />
          )}
          ){abiItem.stateMutability === 'payable' && <span> payable</span>}
        </>
      )}
      {abiItem.type === 'fallback' && (
        <>
          <span className="text-gray-700">fallback</span>()
        </>
      )}
      {abiItem.type === 'receive' && (
        <>
          <span className="text-gray-700">receive</span>() external payable
        </>
      )}
    </span>
  )
}

////////////////////////////////////////////////////////////////////////

export function FormattedAbiParameters(props: {
  compact?: boolean
  params: readonly AbiParameter[]
  showIndexed?: boolean
  showNames?: boolean
}) {
  const { compact, params, showIndexed, showNames } = props
  return (
    <span>
      {params?.map((x, index) => (
        <Fragment key={x.name ?? index}>
          {index !== 0 ? `,${!compact ? ' ' : ''}` : ''}
          <FormattedAbiParameter
            param={x}
            showIndexed={showIndexed}
            showName={showNames}
          />
        </Fragment>
      ))}
    </span>
  )
}

export function FormattedAbiParameter(props: {
  param: AbiParameter
  showIndexed?: boolean
  showName?: boolean
  showType?: boolean
}) {
  const { param, showIndexed = true, showName = true, showType = true } = props
  const { internalType, type, name } = param
  return (
    <span>
      {showType && <ParameterType type={internalType || type} />}
      {showIndexed && 'indexed' in param && param.indexed ? (
        <span className="text-gray-700"> indexed</span>
      ) : null}
      {showName && name ? ` ${name}` : ''}
    </span>
  )
}

export function ParameterType({ type }: { type: string }) {
  const typeArray = type?.split('.').join('').split(' ')
  const type_ = typeArray?.[typeArray.length - 1]
  return <span className="text-gray-700">{type_}</span>
}

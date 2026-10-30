import { Fragment } from 'react'

/**
 * A game's name that may wrap after a slash ("Districts/Divisions of MP"): browsers keep the two
 * words around a slash together, which pushes a big title off a phone's screen.
 */
export default function GameName({ name }: Readonly<{ name: string }>) {
  return name.split('/').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <>
          /<wbr />
        </>
      )}
      {part}
    </Fragment>
  ))
}

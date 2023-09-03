'use client';
import { usePokemon } from '../../hooks/usePokemon';
import Image from 'next/image';

const Pokemon = (): JSX.Element => {
  const { pokemon, error } = usePokemon();
  if (error) {
    return (
      <pre>
        <code>{JSON.stringify(error, null, 2)}</code>
      </pre>
    );
  }
  return (
    <table>
      <tr>
        <th>ID</th>
        <th>name</th>
        <th>pict</th>
      </tr>
      {pokemon
        ? pokemon.map((item) => (
            <tr key={`row-${item.id}`}>
              <td key={`${item.id}-id`}>{item.id}</td>
              <td key={`${item.id}-name`}>{item.name}</td>
              <td key={`${item.id}-value`}>
                {item.visual ? (
                  <Image src={item.visual} alt={item.name} />
                ) : undefined}
              </td>
            </tr>
          ))
        : undefined}
    </table>
  );
};

export default Pokemon;

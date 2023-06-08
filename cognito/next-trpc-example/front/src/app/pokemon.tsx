'use client';
import { usePokemon } from '../hooks/usePokemon';
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
            <tr>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>
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

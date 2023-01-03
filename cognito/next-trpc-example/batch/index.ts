import { S3 } from '@aws-sdk/client-s3';
import { request, gql } from 'graphql-request';

const store = process.env.STORE_BUCKET || '';
const key = process.env.S3_OBJECT_KEY || '';

const s3 = new S3({});

const endpoint = 'https://beta.pokeapi.co/graphql/v1beta';
const query = gql`
query Query {
  pokemon_v2_pokemon {
    id
    pokemon_v2_pokemonspecy {
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: 1}}) {
        name
      }
    }
    pokemon_v2_pokemonsprites {
      sprites
    }
  }
}
`;
type PokeApiResponse = {
  pokemon_v2_pokemon: [
    {
      id: number;
      pokemon_v2_pokemonspecy: {
        pokemon_v2_pokemonspeciesnames: [
          {
            name: string;
          },
        ];
      };
      pokemon_v2_pokemonsprites: [
        {
          sprites: string;
        },
      ];
    },
  ];
};

export type PokemonJsonItem = {
  id: string;
  name: string;
  visual?: string;
};

export type PokemonJson = PokemonJsonItem[];

export const handler = async () => {
  const data = (await request(endpoint, query)) as PokeApiResponse;

  const pokemons = data.pokemon_v2_pokemon.map((item) => {
    console.log(item.pokemon_v2_pokemonsprites);
    return {
      id: item.id,
      name: item.pokemon_v2_pokemonspecy.pokemon_v2_pokemonspeciesnames[0].name,
      visual: item.pokemon_v2_pokemonsprites?.[0]?.sprites
        ? JSON.parse(item.pokemon_v2_pokemonsprites?.[0].sprites).front_default
        : undefined,
    };
  });

  const body = JSON.stringify(pokemons, null, 2);

  await s3.putObject({
    Bucket: store,
    Key: key,
    Body: body,
  });
};

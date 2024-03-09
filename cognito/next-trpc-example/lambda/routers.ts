import { S3 } from '@aws-sdk/client-s3';
import { PokemonJson } from '../batch';

const store = process.env.STORE_BUCKET || '';
const key = process.env.S3_OBJECT_KEY || '';

const s3 = new S3({});

export const pokemon = async () => {
  const result = await s3.getObject({
    Bucket: store,
    Key: key,
  });

  const pkm = await result.Body?.transformToString();
  if (pkm) {
    console.log(JSON.parse(pkm));
    return JSON.parse(pkm) as PokemonJson;
  }
  return undefined;
};

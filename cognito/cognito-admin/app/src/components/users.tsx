import { User } from 'interfaces';
import React, { useEffect } from 'react';


interface UsersProps {
    /**
     * Injected by the documentation to work in an iframe.
     * You won't need it on your project.
     */
    container?: Element,
    users: User[]
  }

const Users: React.FunctionComponent<UsersProps> = (props): JSX.Element => {

    useEffect(
        () => {
        }, [],
    );
    
    return props.users.length > 0 ? (
        <div id='users'>{props.users.map(user => {
                return (
                    <div key={user.username} id={user.username}>{JSON.stringify(user)}</div>
                );
            })}
        </div>) : (
                <div> アカウントなし</div>
            );
};

export default Users;

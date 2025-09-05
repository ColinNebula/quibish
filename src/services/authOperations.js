import { gql } from '@apollo/client';

/**
 * GraphQL operation for user login
 */
export const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        avatar
        role
        status
        statusMessage
        bio
        location
        company
        website
        lastActive
        theme
        notifications
        language
      }
    }
  }
`;

/**
 * GraphQL operation for user registration
 */
export const REGISTER_USER = gql`
  mutation RegisterUser($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      user {
        id
        name
        email
        avatar
        role
        status
        statusMessage
        bio
        location
        company
        website
        lastActive
        theme
        notifications
        language
      }
    }
  }
`;

/**
 * GraphQL operation to get current user data
 */
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      name
      email
      avatar
      role
      status
      statusMessage
      bio
      location
      company
      website
      lastActive
      theme
      notifications
      language
    }
  }
`;

/**
 * GraphQL operation to log out current user
 */
export const LOGOUT_USER = gql`
  mutation LogoutUser {
    logout {
      success
      message
    }
  }
`;

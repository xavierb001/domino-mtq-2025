import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/game';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:id" element={<Game />} />
      </Routes>
    </Router>
  );
}

//class App extends Component {
  //static propTypes = {
    //children: PropTypes.node
  //}
  
  /*render() {
    const { children } = this.props
    return (
      <div>
        {children}
      </div>
    )
  }
  }*/

export default App;